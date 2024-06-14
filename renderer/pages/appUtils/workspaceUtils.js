import MedDataObject from "../../components/workspace/medDataObject"

// Import fs and path
const fs = require("fs")
const path = require("path")

/**
 * Checks if a metadata file exists in the workspace
 */
export const checkIfMetadataFileExists = (workspaceObject) => {
  // Check if a file ending with .medomics exists in the workspace directory
  let metadataFileExists = false
  let workspaceChildren = workspaceObject.workingDirectory.children
  workspaceChildren.forEach((child) => {
    console.log("child", child)
    if (child.name == ".medomics") {
      metadataFileExists = true
    }
  })
  return metadataFileExists
}

// Function to create the .medomics directory and necessary files
export const createMedomicsDirectory = (directoryPath) => {
  const medomicsDir = path.join(directoryPath, ".medomics")
  const mongoDataDir = path.join(medomicsDir, "MongoDBdata")
  const globalDataPath = path.join(medomicsDir, "globalData.json")
  const mongoConfigPath = path.join(medomicsDir, "mongod.conf")

  if (!fs.existsSync(medomicsDir)) {
    // Create .medomicsDir
    fs.mkdirSync(medomicsDir)
  }

  if (!fs.existsSync(mongoDataDir)) {
    // Create MongoDB data dir
    fs.mkdirSync(mongoDataDir)
  }

  if (!fs.existsSync(globalDataPath)) {
    // Create globalData.json
    /* let globalData = {
        DATA: new MEDDataObject({ name: "DATA", type: "folder" }),
        EXPERIMENTS: new MEDDataObject({ name: "EXPERIMENTS", type: "folder" })
      } */
    let globalData = {}
    console.log("here", globalData)
    fs.writeFileSync(globalDataPath, JSON.stringify(globalData, null, 2))
  }

  if (!fs.existsSync(mongoConfigPath)) {
    // Create mongod.conf
    const mongoConfig = `
    systemLog:
      destination: file
      path: ${path.join(medomicsDir, "mongod.log")}
      logAppend: true
    storage:
      dbPath: ${mongoDataDir}
    net:
      bindIp: 127.0.0.1
      port: 27017
    `
    fs.writeFileSync(mongoConfigPath, mongoConfig)
  }
}

/**
 * @param {Object} children - The children of the current directory
 * @param {String} parentID - The UUID of the parent directory
 * @param {Object} newGlobalData - The global data object
 * @param {Array} acceptedFileTypes - The accepted file types for the current directory
 * @returns {Object} - The children IDs of the current directory
 * @description This function is used to recursively recense the directory tree and add the files and folders to the global data object
 * It is called when the working directory is set
 */
export function recursivelyRecenseTheDirectory(children, parentID, newGlobalData, acceptedFileTypes = undefined) {
  let childrenIDsToReturn = []

  children.forEach((child) => {
    let uuid = MedDataObject.checkIfMedDataObjectInContextbyName(child.name, newGlobalData, parentID)
    let objectType = "folder"
    let objectUUID = uuid
    let childrenIDs = []
    if (uuid == "") {
      let dataObject = new MedDataObject({
        originalName: child.name,
        path: child.path,
        parentID: parentID,
        type: objectType
      })

      objectUUID = dataObject.getUUID()
      let acceptedFiles = MedDataObject.setAcceptedFileTypes(dataObject, acceptedFileTypes)
      dataObject.setAcceptedFileTypes(acceptedFiles)
      if (child.children === undefined) {
        objectType = "file"
        childrenIDs = null
      } else if (child.children.length != 0) {
        let answer = recursivelyRecenseTheDirectory(child.children, objectUUID, newGlobalData, acceptedFiles)
        childrenIDs = answer.childrenIDsToReturn
      }
      dataObject.setType(objectType)
      dataObject.setChildrenIDs(childrenIDs)
      newGlobalData[objectUUID] = dataObject
      childrenIDsToReturn.push(objectUUID)
    } else {
      let dataObject = newGlobalData[uuid]
      let acceptedFiles = dataObject.acceptedFileTypes
      if (child.children !== undefined) {
        let answer = recursivelyRecenseTheDirectory(child.children, uuid, newGlobalData, acceptedFiles)
        childrenIDs = answer.childrenIDsToReturn
        newGlobalData[objectUUID]["childrenIDs"] = childrenIDs
        newGlobalData[objectUUID]["parentID"] = parentID
      }
      childrenIDsToReturn.push(uuid)
    }
  })
  return { childrenIDsToReturn: childrenIDsToReturn }
}

/**
 * Gets the children paths of the children passed as a parameter
 * @param {Object} children - The children of the current directory
 * @returns {Array} - The children paths of the current directory
 * @description This function is used to recursively recense the directory tree and add the files and folders to the global data object
 */
const getChildrenPaths = (children) => {
  let childrenPaths = []
  children.forEach((child) => {
    childrenPaths.push(child.path)
    if (child.children !== undefined) {
      let answer = getChildrenPaths(child.children)
      childrenPaths = childrenPaths.concat(answer)
    }
  })
  return childrenPaths
}

/**
 * Creates a list of files not found in the workspace
 * @param {Object} currentWorkspace - The current workspace
 * @param {Object} currentGlobalData - The current global data
 * @returns {Array} - The list of files not found in the workspace
 */
export const createListOfFilesNotFoundInWorkspace = (currentWorkspace, currentGlobalData) => {
  let listOfFilesNotFoundInWorkspace = []
  let workspaceChildren = currentWorkspace.workingDirectory.children
  let workspaceChildrenPaths = []
  if (workspaceChildren !== undefined) {
    workspaceChildrenPaths = getChildrenPaths(workspaceChildren)
  } else {
    return listOfFilesNotFoundInWorkspace
  }

  Object.keys(currentGlobalData).forEach((key) => {
    let dataObject = currentGlobalData[key]
    let filePath = dataObject.path
    if (!workspaceChildrenPaths.includes(filePath)) {
      listOfFilesNotFoundInWorkspace.push(dataObject._UUID)
    }
  })
  return listOfFilesNotFoundInWorkspace
}

/**
 * Function that saves a JSON Object to a file to a specified path
 * @param {Object} objectToSave - The object to save
 * @param {String} path - The path to save the object to
 * @returns {Promise} - A promise that resolves when the object is saved
 */
export const saveObjectToFile = (objectToSave, path) => {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line no-undef
    const fsx = require("fs-extra")
    fsx.writeFile(path, JSON.stringify(objectToSave, null, 2), (err) => {
      if (err) {
        console.error(err)
        reject(err)
      }
      resolve()
    })
  })
}
