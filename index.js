#!/usr/bin/env/ node
import chalk from "chalk";
import inquirer from "inquirer";
import { createSpinner } from 'nanospinner'
import { MongoClient } from 'mongodb'
import Chance from "chance";
// process.exit(1) -> Erro, process.exit(0) -> Sucesso
const chance = new Chance()
function generateValueBaseOnType (type) {
  // console.log('type', type)
  let returnedValue
  switch (type) {
    case 'number':
      returnedValue = chance.floating({ min: 0, fixed: 2 })
    break;
    case 'string':
      returnedValue = chance.sentence({ words: 5 })
    break;
    case 'boolean':
      returnedValue = chance.bool()
    break;
    default:
      returnedValue = null
    break;
  }
  return returnedValue
}

const mongoConfig = {
  url: 'mongodb://localhost:27017',
  databaseName: ''
}

let mongoClient
let primaryAction = ''

console.log(chalk.green('Mongodb popularizador.'))
console.log(chalk.green(`Popularizador vai copiar um documento de exemplo e gerar dados randomizados com base no tipo de dado`))

const primaryActionAnswerer = await inquirer.prompt({
  name: 'action',
  type: 'list',
  message: 'Escolha ação inicial',
  choices: [
    'Popular banco'
  ]
})
primaryAction = primaryActionAnswerer.action


const mongoUrlAnswerer = await inquirer.prompt({
  name: 'url',
  type: 'input',
  message: 'Insira a url para a conexão com o banco',
  default: mongoConfig.url
})
mongoConfig.url = mongoUrlAnswerer.url



// console.log(chalk.red('Tentando conexão com o banco de dados'))
const spinner = createSpinner('Tentando conexão com o banco de dados').start()

try {
  mongoClient = new MongoClient(mongoConfig.url)
  await mongoClient.connect()
  spinner.success('Conectado ao banco de dados')
} catch (error) {
  console.log('error',error)
  spinner.error({ text: 'Erro ao conectar ao banco' })
  process.exit(1)
}

const databaseList = await mongoClient.db().admin().listDatabases()
const choices = databaseList.databases.map(database => database.name)
const defaultDbName = '* Novo banco'
choices.push(defaultDbName)
// console.log('choices', choices)
const databaseNameAnswerer = await inquirer.prompt({
  name: 'dbName',
  type: 'list',
  message: 'Selecione um banco de dados',
  choices: choices,
  default: defaultDbName
})

mongoConfig.databaseName = databaseNameAnswerer.dbName

if (databaseNameAnswerer.dbName === defaultDbName) {
  const newDatabaseAnswerer = await inquirer.prompt({
    name: 'dbName',
    type: 'input',
    message: 'Digite o nome do novo banco de dados'
  })
  mongoConfig.databaseName = newDatabaseAnswerer.dbName
}

const selectedDatabase = mongoClient.db(mongoConfig.databaseName)

const possibleCollections = await selectedDatabase.listCollections().toArray()

// console.log('possibleCollections', possibleCollections)

const collectionName = await inquirer.prompt({
  name: 'collectionName',
  type: 'list',
  message: 'Selecione uma coleção para receber os documentos',
  choices: possibleCollections
})

const selectedCollection = collectionName.collectionName

const copyTypeAnswerer = await inquirer.prompt({
  name: 'copyType',
  type: 'list',
  message: 'Selecione um',
  choices: [
    'Popular a partir de um documento existente',
    'Inserir documento para popular'
  ]
})

async function quantityOfCopies () {
  const quantityOfCopiesAnswerer = await inquirer.prompt({
    name: 'quantityOfCopies',
    type: 'number',
    message: 'Digite a quantidade de cópias ',
    default: 1
  })

  return quantityOfCopiesAnswerer.quantityOfCopies
}

if (copyTypeAnswerer.copyType === 'Popular a partir de um documento existente') {
  const documentToCopy = await mongoClient.db(mongoConfig.databaseName).collection(selectedCollection).findOne({})
  console.log(chalk.green('Documento selecionado:'), documentToCopy)
  delete documentToCopy._id
  const collectionValueAnswerer = await inquirer.prompt({
    name: 'collectionValue',
    type: 'list',
    message: 'Selecione uma coleção para receber os documentos',
    choices: [
      'Usar os valores do documento selecionado',
      'Gerar valores aleatórios'
    ]
  })

    if (collectionValueAnswerer.collectionValue === 'Usar os valores do documento selecionado') {
      const quantityToCopy = await quantityOfCopies()
      const copiedDocuments = []
      for (let i = 0; i <= quantityToCopy; i++) {
        copiedDocuments.push(documentToCopy)
      }
      const spinner2 = createSpinner('Inserindo dados, isso pode demorar...').start()
      try {
        await mongoClient.db(mongoConfig.databaseName).collection(selectedCollection).insertMany(copiedDocuments, {ordered : false })
        spinner2.success('Tudo certo')
      } catch (error) {
        console.log('error', error)
        spinner2.error(error)
        process.exit(1)
      }
      process.exit(0)
    } else if (collectionValueAnswerer.collectionValue === 'Gerar valores aleatórios') {
      const quantityToCopy = await quantityOfCopies()
      // console.log('documentToCopy', documentToCopy)
      // console.log('obj', Object.entries(documentToCopy))
      const documentAttributes = Object.entries(documentToCopy).map(document => document[0])
      const documentValues = Object.entries(documentToCopy).map(document => typeof document[1])
      // console.log('documentAttributes', documentAttributes)
      // console.log('documentValues', documentValues)
      const copiedDocuments = []
      for (let i = 0; i <= quantityToCopy; i++) {
        const newDocument = {}
        documentAttributes.forEach((attribute, index) => {
          // console.log('attribute', attribute)
          // console.log('documentValues[index]', documentValues[index])
          newDocument[attribute] = generateValueBaseOnType(documentValues[index])
        })

        copiedDocuments.push(newDocument)
      }
      console.log('copiedDocuments', copiedDocuments)
      const spinner2 = createSpinner('Inserindo dados, isso pode demorar...').start()
      try {
        await mongoClient.db(mongoConfig.databaseName).collection(selectedCollection).insertMany(copiedDocuments, {ordered : false })
        spinner2.success('Tudo certo')
      } catch (error) {
        console.log('error', error)
        spinner2.error(error)
        process.exit(1)
      }
    }
  } else if (copyTypeAnswerer.copyType === 'Inserir documento para popular') {

  }

process.exit(1)