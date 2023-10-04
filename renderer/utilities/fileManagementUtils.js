const fs = require("fs")
const path = require("path")
const { parse } = require("csv-parse")
const dfd = require("danfojs")
var Papa = require("papaparse")
/**
 *
 * @param {Object} exportObj object to be exported
 * @param {String} exportName name of the exported file
 *
 * @description
 * This function takes an object and a name and downloads the object as a json file
 * It create a temporary anchor element to ask the user where to download the file
 */
const downloadJson = (exportObj, exportName) => {
  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2))
  var downloadAnchorNode = document.createElement("a")
  downloadAnchorNode.setAttribute("href", dataStr)
  downloadAnchorNode.setAttribute("download", exportName + ".json")
  document.body.appendChild(downloadAnchorNode) // required for firefox
  downloadAnchorNode.click()
  downloadAnchorNode.remove()
}

/**
 *
 * @param {Object} exportObj object to be exported
 * @param {String} path path to the folder where the file will be saved
 * @param {String} name name of the exported file
 * @param {String} extension extension of the exported file (json or even custom (e.g. abc)))
 *
 * @description
 * This function takes an object, a path and a name and saves the object as a json file with a custom extension
 */
const writeFile = (exportObj, path, name, extension) => {
  extension ? (extension = extension.replace(".", "")).toLowerCase() : (extension = "json")
  const cwd = process.cwd()
  let cwdSlashType = cwd.includes("/") ? "/" : "\\"
  console.log("writing json file: " + path + cwdSlashType + name + "." + extension)
  fs.writeFile(path + cwdSlashType + name + "." + extension, JSON.stringify(exportObj, null, 2), function (err) {
    if (err) {
      return console.log(err)
    }
    console.log("The file was saved!")
  })
}

/**
 *
 * @description
 * This function opens a file dialog and returns the selected json file
 */
const loadJson = () => {
  let jsonFile
  let input = document.createElement("input")
  input.type = "file"
  input.onchange = function () {
    var reader = new FileReader()
    reader.onload = onReaderLoad
    reader.readAsText(event.target.files[0])
  }
  function onReaderLoad(event) {
    jsonFile = JSON.parse(event.target.result)
    console.log(jsonFile)

    return jsonFile
  }
  input.click()
}

/**
 *
 * @returns {Promise} Promise that resolves to the selected json file
 *
 * @description
 * This function opens a file dialog and returns the selected json file
 */
const loadJsonSync = () => {
  return new Promise((resolve) => {
    let input = document.createElement("input")
    input.type = "file"
    input.onchange = function () {
      var reader = new FileReader()
      reader.onload = function (event) {
        const jsonFile = JSON.parse(event.target.result)
        console.log(jsonFile)
        resolve(jsonFile) // Resolve the Promise with the parsed JSON object
      }
      reader.readAsText(event.target.files[0])
    }
    input.click()
  })
}

/**
 * @param {String} path
 * @returns {Object} json object
 * @description
 * This function takes a path and returns the json object
 */
const loadJsonPath = (path) => {
  const fs = require("fs")
  if (path == "") {
    console.log("path empty")
    return null
  }
  try {
    const cwd = process.cwd()
    let cwdSlashType = cwd.includes("/") ? "/" : "\\"
    let cwdSlashTypeInv = cwdSlashType == "/" ? "\\" : "/"
    path.charAt(0) == "." && (path = cwd + path.substring(1).replaceAll(cwdSlashTypeInv, cwdSlashType))
    console.log("reading json file: " + path)
    const data = fs.readFileSync(path)
    const jsonData = JSON.parse(data)
    return jsonData
  } catch (error) {
    console.error("error reading json file: " + path + "\n" + error + "\n")
    return null
  }
}

/**
 *
 * @param {String} path
 * @returns {Object} json object
 * @description
 * This function takes a path and returns the json object
 */
const loadCSVPath = (path, whenLoaded) => {
  const data = []
  // get current working directory
  const cwd = process.cwd()
  let cwdSlashType = cwd.includes("/") ? "/" : "\\"
  let cwdSlashTypeInv = cwdSlashType == "/" ? "\\" : "/"
  path.charAt(0) == "." && (path = cwd + path.substring(1).replaceAll(cwdSlashTypeInv, cwdSlashType))
  console.log("reading csv file: " + path)
  try {
    fs.createReadStream(path)
      .pipe(
        parse({
          delimiter: ",",
          columns: true,
          ltrim: true
        })
      )
      .on("data", function (row) {
        // This will push the object row into the array
        data.push(row)
      })
      .on("error", function (error) {
        console.log(error.message)
      })
      .on("end", function () {
        // Here log the result array
        console.log("parsed csv data:")
        console.log(data)
        whenLoaded(data)
      })
  } catch (error) {
    toast.warn("Having trouble reading the CSV file, trying another method...")
  }
}

const loadCSVFromPath = (path, whenLoaded) => {
  let csvPath = path
  fs.readFile(csvPath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading file:", err)
    } else {
      console.log("File read successfully")
      let array = []
      Papa.parse(data, {
        step: function (row) {
          array.push(row.data)
        }
      })
      let columns = array.shift()
      let df = new dfd.DataFrame(array, { columns: columns })
      let dfJSON = dfd.toJSON(df)
      whenLoaded(dfJSON)
    }
  })
}

const loadJSONFromPath = (path, whenLoaded) => {
  let jsonPath = path
  fs.readFile(jsonPath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading file:", err)
    } else {
      console.log("File read successfully")
      let result = JSON.parse(data)

      let df = new dfd.DataFrame(result)
      let dfJSON = dfd.toJSON(df)
      console.log("DFJSON", dfJSON)
      whenLoaded(dfJSON)
    }
  })
}

function createFolder(path_, folderName) {
  // Creates a folder in the working directory
  const folderPath = path.join(path_, folderName)

  fs.mkdir(folderPath, { recursive: true }, (err) => {
    if (err) {
      console.error(err)
      return
    }

    console.log("Folder created successfully!")
  })
}

export {
  downloadJson,
  writeFile,
  loadJson,
  loadJsonSync,
  loadJsonPath,
  loadCSVPath,
  loadCSVFromPath,
  createFolder,
  loadJSONFromPath
}
