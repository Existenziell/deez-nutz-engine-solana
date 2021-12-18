const basePath = process.cwd()
const { NETWORK } = require(`${basePath}/constants/network.js`)
// const { MODE } = require(`${basePath}/constants/blendMode.js`)

const network = NETWORK.eth
const baseUri = 'https://ipfs.infura.io/ipfs/'

// General metadata for Ethereum
const defaultMetadata = {
  namePrefix: 'DeezNutz NFTs',
  description: 'Algorithmically generated NFT ball sacks',
  externalUrl: 'https://deez-nutz-dapp.vercel.app/api/',
}

// Addiontional metadata for Solana
const solanaMetadata = {
  symbol: 'DNN',
  seller_fee_basis_points: 1000, // Define how much % you want from secondary market sales 1000 = 10%
  external_url: 'https://deez-nutz-dapp.vercel.app/api/',
  creators: [
    {
      address: '7fXNuer5sbZtaTEPhtJ5g5gNtuyRoKkvxdjEjEnPN4mC',
      share: 100,
    },
  ],
}

// If you have selected Solana then the collection starts from 0 automatically
const layerConfigurations = [
  {
    growEditionSizeTo: 10,
    layersOrder: [
      { name: 'Background' },
      { name: 'Balls' },
      { name: 'Master' },
      { name: 'Eyes' },
      { name: 'Mouth' },
      { name: 'Hands' },
      { name: 'Hair-Glasses' },
      { name: 'Extras' },
    ],
  },
]

// {
//   name: 'Background',
//   options: {
//     blend: MODE.multiply,
//     opacity: 0.2,
//     displayName: 'Renamed Background',
//   }
// },

const shuffleLayerConfigurations = false
const debugLogs = false

const format = {
  width: 1000,
  height: 1000,
  smoothing: false,
}

const gif = {
  export: false,
  repeat: 0,
  quality: 100,
  delay: 500,
}

const text = {
  only: false,
  color: '#ffffff',
  size: 20,
  xGap: 40,
  yGap: 40,
  align: 'left',
  baseline: 'top',
  weight: 'regular',
  family: 'Courier',
  spacer: ' => ',
}

const pixelFormat = {
  // ratio: 2 / 128,
  ratio: 10 / 128,
}

const background = {
  generate: false,
  brightness: '80%',
  static: false,
  default: '#000000',
}

const rarityDelimiter = '#'
const dnaDelimiter = '-'
const uniqueDnaTorrance = 10000

const preview = {
  thumbPerRow: 5,
  thumbWidth: 50,
  imageRatio: format.height / format.width,
  imageName: 'preview.png',
}

const previewGif = {
  numberOfImages: 5,
  order: 'ASC', // ASC, DESC, MIXED
  repeat: 0,
  quality: 100,
  delay: 500,
  imageName: 'preview.gif',
}

module.exports = {
  format,
  baseUri,
  background,
  uniqueDnaTorrance,
  layerConfigurations,
  rarityDelimiter,
  dnaDelimiter,
  preview,
  shuffleLayerConfigurations,
  debugLogs,
  pixelFormat,
  text,
  network,
  defaultMetadata,
  solanaMetadata,
  gif,
  previewGif,
}
