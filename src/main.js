const basePath = process.cwd()
const fs = require("fs")
const buildDir = `${basePath}/build`
const layersDir = `${basePath}/layers`
const { create } = require('ipfs-http-client')
const client = create('https://ipfs.infura.io:5001/api/v0')
const { NETWORK } = require(`${basePath}/constants/network.js`)
const sha1 = require(`${basePath}/node_modules/sha1`)
const Giffer = require(`${basePath}/utils/Giffer.js`)
const { createCanvas, loadImage } = require(`${basePath}/node_modules/canvas`)

const {
  createDna,
  isDnaUnique,
  getElements,
  drawBackground,
  shuffle,
  constructLayerToDna,
  filterDNAOptions,
  addMetadata,
  writeMetaData,
  saveMetaDataSingleFile,
  addAttributes,
  metadataList,
} = require(`${basePath}/src/lib.js`)

const {
  format,
  baseUri,
  background,
  uniqueDnaTorrance,
  layerConfigurations,
  shuffleLayerConfigurations,
  debugLogs,
  text,
  network,
  gif,
} = require(`${basePath}/src/config.js`)

const canvas = createCanvas(format.width, format.height)
const ctx = canvas.getContext("2d")
ctx.imageSmoothingEnabled = format.smoothing

let dnaList = new Set()
let giffer = null

const buildSetup = () => {
  if (fs.existsSync(buildDir)) {
    fs.rmdirSync(buildDir, { recursive: true })
  }
  fs.mkdirSync(buildDir)
  fs.mkdirSync(`${buildDir}/json`)
  fs.mkdirSync(`${buildDir}/images`)
  if (gif.export) {
    fs.mkdirSync(`${buildDir}/gifs`)
  }
}

const layersSetup = (layersOrder) => {
  const layers = layersOrder.map((layerObj, index) => ({
    id: index,
    elements: getElements(`${layersDir}/${layerObj.name}/`),
    name:
      layerObj.options?.["displayName"] != undefined
        ? layerObj.options?.["displayName"]
        : layerObj.name,
    blend:
      layerObj.options?.["blend"] != undefined
        ? layerObj.options?.["blend"]
        : "source-over",
    opacity:
      layerObj.options?.["opacity"] != undefined
        ? layerObj.options?.["opacity"]
        : 1,
    bypassDNA:
      layerObj.options?.["bypassDNA"] !== undefined
        ? layerObj.options?.["bypassDNA"]
        : false,
  }))
  return layers
}

const saveImage = (_editionCount) => {
  const image = canvas.toBuffer("image/png")
  fs.writeFileSync(
    `${buildDir}/images/${_editionCount}.png`,
    image
  )
  return image
}

// Upoad to IPFS
const uploadImage = async (image) => {
  console.log("Uploading to IPFS...")
  try {
    const added = await client.add(
      image,
      {
        progress: (prog) => console.log(`...sent: ${prog}`)
      }
    )
    const url = baseUri + added.path
    return url
  } catch (error) {
    console.log('Error uploading file: ', error)
  }
}

const loadLayerImg = async (_layer) => {
  return new Promise(async (resolve) => {
    const image = await loadImage(`${_layer.selectedElement.path}`)
    resolve({ layer: _layer, loadedImage: image })
  })
}

const addText = (_sig, x, y, size) => {
  ctx.fillStyle = text.color
  ctx.font = `${text.weight} ${size}pt ${text.family}`
  ctx.textBaseline = text.baseline
  ctx.textAlign = text.align
  ctx.fillText(_sig, x, y)
}

const drawElement = (_renderObject, _index, _layersLen) => {
  ctx.globalAlpha = _renderObject.layer.opacity
  ctx.globalCompositeOperation = _renderObject.layer.blend
  text.only
    ? addText(
      `${_renderObject.layer.name}${text.spacer}${_renderObject.layer.selectedElement.name}`,
      text.xGap,
      text.yGap * (_index + 1),
      text.size
    )
    : ctx.drawImage(
      _renderObject.loadedImage,
      0,
      0,
      format.width,
      format.height
    )

  addAttributes(_renderObject)
}

// Main start
const startCreating = async () => {
  let layerConfigIndex = 0
  let editionCount = 1
  let failedCount = 0
  let abstractedIndexes = []
  for (
    let i = network == NETWORK.sol ? 0 : 1;
    i <= layerConfigurations[layerConfigurations.length - 1].growEditionSizeTo;
    i++
  ) {
    abstractedIndexes.push(i)
  }
  if (shuffleLayerConfigurations) {
    abstractedIndexes = shuffle(abstractedIndexes)
  }
  debugLogs
    ? console.log("Editions left to create: ", abstractedIndexes)
    : null
  while (layerConfigIndex < layerConfigurations.length) {
    const layers = layersSetup(
      layerConfigurations[layerConfigIndex].layersOrder
    )
    while (
      editionCount <= layerConfigurations[layerConfigIndex].growEditionSizeTo
    ) {
      let newDna = createDna(layers)
      if (isDnaUnique(dnaList, newDna)) {
        let results = constructLayerToDna(newDna, layers)
        let loadedElements = []

        results.forEach((layer) => {
          loadedElements.push(loadLayerImg(layer))
        })

        await Promise.all(loadedElements).then((renderObjectArray) => {
          debugLogs ? console.log("Clearing canvas") : null
          ctx.clearRect(0, 0, format.width, format.height)
          if (gif.export) {
            giffer = new Giffer(
              canvas,
              ctx,
              `${buildDir}/gifs/${abstractedIndexes[0]}.gif`,
              gif.repeat,
              gif.quality,
              gif.delay
            )
            giffer.start()
          }
          if (background.generate) {
            drawBackground()
          }

          console.log('----------------------------------------')
          console.log("Start creation of NFT", editionCount);
          console.log(`Drawing layers`)

          renderObjectArray.forEach((renderObject, index) => {
            drawElement(
              renderObject,
              index,
              layerConfigurations[layerConfigIndex].layersOrder.length
            )
            if (gif.export) {
              giffer.add()
            }
          })
          if (gif.export) {
            giffer.stop()
          }
          debugLogs
            ? console.log("Editions left to create: ", abstractedIndexes)
            : null
        })

        const index = abstractedIndexes[0]
        const image = await saveImage(index)
        const url = await uploadImage(image)
        const meta = await addMetadata(newDna, index, url)
        await saveMetaDataSingleFile(index)
        await writeMetaData(JSON.stringify(metadataList, null, 2))

        console.log(`Created edition: ${index}, with DNA: ${sha1(newDna)}`)

        dnaList.add(filterDNAOptions(newDna))
        editionCount++
        abstractedIndexes.shift()
      } else {
        console.log("DNA exists!")
        failedCount++
        if (failedCount >= uniqueDnaTorrance) {
          console.log(
            `You need more layers or elements to grow your edition to ${layerConfigurations[layerConfigIndex].growEditionSizeTo} artworks!`
          )
          process.exit()
        }
      }
    }
    layerConfigIndex++
  }
}

module.exports = { startCreating, buildSetup, getElements }
