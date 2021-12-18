const basePath = process.cwd()
const buildDir = `${basePath}/build`
const fs = require("fs")
const sha1 = require(`${basePath}/node_modules/sha1`)
const { NETWORK } = require(`${basePath}/constants/network.js`)

const {
  format,
  background,
  rarityDelimiter,
  dnaDelimiter,
  debugLogs,
  network,
  defaultMetadata,
  solanaMetadata,
} = require(`${basePath}/src/config.js`)

let metadataList = []
let attributesList = []

/**
 * 
 * DNA
 * 
 */

const constructLayerToDna = (_dna = "", _layers = []) => {
  let mappedDnaToLayers = _layers.map((layer, index) => {
    let selectedElement = layer.elements.find(
      (e) => e.id == cleanDna(_dna.split(dnaDelimiter)[index])
    )
    return {
      name: layer.name,
      blend: layer.blend,
      opacity: layer.opacity,
      selectedElement: selectedElement,
    }
  })
  return mappedDnaToLayers
}

const filterDNAOptions = (_dna) => {
  const dnaItems = _dna.split(dnaDelimiter)
  const filteredDNA = dnaItems.filter((element) => {
    const query = /(\?.*$)/
    const querystring = query.exec(element)
    if (!querystring) {
      return true
    }
    const options = querystring[1].split("&").reduce((r, setting) => {
      const keyPairs = setting.split("=")
      return { ...r, [keyPairs[0]]: keyPairs[1] }
    }, [])

    return options.bypassDNA
  })

  return filteredDNA.join(dnaDelimiter)
}

const isDnaUnique = (_DnaList = new Set(), _dna = "") => {
  const _filteredDNA = filterDNAOptions(_dna)
  return !_DnaList.has(_filteredDNA)
}

const createDna = (_layers) => {
  let randNum = []
  _layers.forEach((layer) => {
    let totalWeight = 0
    layer.elements.forEach((element) => {
      totalWeight += element.weight
    })
    // number between 0 - totalWeight
    let random = Math.floor(Math.random() * totalWeight)
    for (let i = 0; i < layer.elements.length; i++) {
      // subtract the current weight from the random weight until we reach a sub zero value.
      random -= layer.elements[i].weight
      if (random < 0) {
        return randNum.push(
          `${layer.elements[i].id}:${layer.elements[i].filename}${layer.bypassDNA ? "?bypassDNA=true" : ""
          }`
        )
      }
    }
  })
  return randNum.join(dnaDelimiter)
}

const removeQueryStrings = (_dna) => {
  const query = /(\?.*$)/
  return _dna.replace(query, "")
}

const cleanDna = (_str) => {
  const withoutOptions = removeQueryStrings(_str)
  let dna = Number(withoutOptions.split(":").shift())
  return dna
}

/**
 * 
 * Utilities
 * 
 */

const genColor = () => {
  let hue = Math.floor(Math.random() * 360)
  let pastel = `hsl(${hue}, 100%, ${background.brightness})`
  return pastel
}

const shuffle = (array) => {
  let currentIndex = array.length,
    randomIndex
  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ]
  }
  return array
}

const drawBackground = () => {
  ctx.fillStyle = background.static ? background.default : genColor()
  ctx.fillRect(0, 0, format.width, format.height)
}

const getRarityWeight = (_str) => {
  let nameWithoutExtension = _str.slice(0, -4)
  let nameWithoutWeight = Number(
    nameWithoutExtension.split(rarityDelimiter).pop()
  )
  if (isNaN(nameWithoutWeight)) {
    nameWithoutWeight = 1
  }
  return nameWithoutWeight
}

const cleanName = (_str) => {
  let nameWithoutExtension = _str.slice(0, -4)
  let nameWithoutWeight = nameWithoutExtension.split(rarityDelimiter).shift()
  return nameWithoutWeight
}

const getElements = (path) => {
  return fs
    .readdirSync(path)
    .filter((item) => !/(^|\/)\.[^\/\.]/g.test(item))
    .map((i, index) => {
      return {
        id: index,
        name: cleanName(i),
        filename: i,
        path: `${path}${i}`,
        weight: getRarityWeight(i),
      }
    })
}

/**
 * 
 * MetaData
 * 
 */

const writeMetaData = (_data) => {
  console.log(`saveMetadataAll`)
  fs.writeFileSync(`${buildDir}/json/_metadata.json`, _data)
}

const saveMetaDataSingleFile = (edition) => {
  console.log("saveMetaDataSingleFile")
  let metadata = metadataList.find((meta) => meta.edition == edition)
  debugLogs
    ? console.log(
      `Writing metadata for ${edition}: ${JSON.stringify(metadata)}`
    )
    : null
  fs.writeFileSync(
    `${buildDir}/json/${edition}.json`,
    JSON.stringify(metadata, null, 2)
  )
}

const addMetadata = (_dna, _edition, ipfsUrl) => {
  let dateTime = Date.now()
  let tempMetadata = {
    name: `${defaultMetadata.namePrefix} #${_edition}`,
    description: defaultMetadata.description,
    image: ipfsUrl,
    dna: sha1(_dna),
    edition: _edition,
    date: dateTime,
    attributes: attributesList,
    external_url: defaultMetadata.externalUrl,
    compiler: "DeezNutz NFT Engine",
  }
  if (network == NETWORK.sol) {
    tempMetadata = {
      name: tempMetadata.name,
      symbol: solanaMetadata.symbol,
      description: tempMetadata.description,
      seller_fee_basis_points: solanaMetadata.seller_fee_basis_points,
      image: `image.png`,
      external_url: solanaMetadata.external_url,
      edition: _edition,
      attributes: tempMetadata.attributes,
      properties: {
        files: [
          {
            uri: "image.png",
            type: "image/png",
          },
        ],
        category: "image",
        creators: solanaMetadata.creators,
      },
    }
  }
  metadataList.push(tempMetadata)
  attributesList = []
  return tempMetadata
}

const addAttributes = (_element) => {
  let selectedElement = _element.layer.selectedElement
  attributesList.push({
    trait_type: _element.layer.name,
    value: selectedElement.name,
  })
}

/**
 * 
 * Export
 * 
 */

module.exports = {
  createDna,
  cleanDna,
  isDnaUnique,
  cleanName,
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
}
