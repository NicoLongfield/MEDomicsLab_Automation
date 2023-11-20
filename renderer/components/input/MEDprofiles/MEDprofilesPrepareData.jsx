import Button from "react-bootstrap/Button"
import { DataContext } from "../../workspace/dataContext"
import { DataFrame, Series } from "danfojs"
import { DataView } from "primereact/dataview"
import { Dropdown } from "primereact/dropdown"
import { ErrorRequestContext } from "../../generalPurpose/errorRequestContext"
import { InputText } from "primereact/inputtext"
import { LayoutModelContext } from "../../layout/layoutContext"
import { loadCSVPath } from "../../../utilities/fileManagementUtils"
import MedDataObject from "../../workspace/medDataObject"
import { Message } from "primereact/message"
import { MultiSelect } from "primereact/multiselect"
import ProgressBarRequests from "../../generalPurpose/progressBarRequests"
import { ProgressSpinner } from "primereact/progressspinner"
import React, { useContext, useEffect, useState } from "react"
import { requestJson } from "../../../utilities/requests"
import { toast } from "react-toastify"
import { WorkspaceContext } from "../../workspace/workspaceContext"

/**
 *
 * @returns {JSX.Element} a page
 *
 * @description
 * Component of the input module as an Accordion, MEDprofilesPrepareDara allows the user to
 * create MEDclasses from a master table, instantiate his master table data as MEDprofiles,
 * and finally open the generated data in MEDprofilesViewer.
 *
 */
const MEDprofilesPrepareData = () => {
  const [creatingMEDclasses, setCreatingMEDclasses] = useState(false) // boolean telling if the process of MEDclasses creation is running
  const [dataFolder, setDataFolder] = useState(null) // folder where the csv files will be examinated and where the MEDprofiles data will be saved
  const [binaryFileList, setBinaryFileList] = useState([]) // list of available binary files
  const [binaryFilename, setBinaryFilename] = useState("MEDprofiles_bin.pkl") // name under which the MEDprofiles binary file will be saved
  const [folderList, setFolderList] = useState([]) // list of available folders in DATA folder
  const [generatedClassesFolder, setGeneratedClassesFolder] = useState(null) // folder containing the generated MEDclasses
  const [generatedClassesFolderPath, setGeneratedClassesFolderPath] = useState(null) // path of the folder containing the generated MEDclasses
  const [generatedMasterPath, setGeneratedMasterPath] = useState(null) // path of the last generated master table
  const [generatedMEDprofilesFile, setGeneratedMEDprofilesFile] = useState(null) // file containing the generated MEDprofiles binary file
  const [generatedMEDprofilesFilePath, setGeneratedMEDprofilesFilePath] = useState(null) // path of the file containing the generated MEDprofiles binary file
  const [instantiatingMEDprofiles, setInstantiatingMEDprofiles] = useState(false) // boolean telling if the process of instantiating MEDprofiles is running
  const [loadingMasterTables, setLoadingMasterTables] = useState(false) // boolean telling if the csv analyse for mastertable is processing
  const [loadingSubMasterTables, setLoadingSubMasterTables] = useState(false) // boolean telling if the csv analyse for submaster is processing
  const [masterFilename, setMasterFilename] = useState("master_table.csv") // name under which the created master_table will be saved
  const [masterTableFileList, setMasterTableFileList] = useState([]) // list of csv data matching the "MasterTable" format
  const [MEDclassesFolderList, setMEDclassesFolderList] = useState([]) // list of the folder that may contain MEDclasses
  const [MEDprofilesFolderPath, setMEDprofilesFolderPath] = useState(null) // MEDprofiles folder path
  const [progress, setProgress] = useState({ now: 0, currentLabel: "" }) // progress bar state [now, currentLabel]
  const [rootDataFolder, setRootDataFolder] = useState(null) // DATA folder
  const [selectedMasterTable, setSelectedMasterTable] = useState(null) // dataset of data to extract used to be display
  const [selectedSubMasterTableFiles, setSelectedSubMasterTableFiles] = useState(null) // selected csv for master table creation
  const [subMasterTableFileList, setSubMasterTableFileList] = useState([]) // list of csv data matching the "Sub-MasterTable" format
  const [showProgressBar, setShowProgressBar] = useState(false) // wether to show or not the extraction progressbar

  const { dispatchLayout } = useContext(LayoutModelContext) // used to open the MEDprofiles Viewer tab
  const { globalData } = useContext(DataContext) // we get the global data from the context to retrieve the directory tree of the workspace, thus retrieving the data files
  const { port } = useContext(WorkspaceContext) // we get the port for server connexion
  const { setError } = useContext(ErrorRequestContext) // used to diplay the errors

  /**
   * @description
   * This functions get all folders from the DataContext DATA folder and update folderList.
   */
  function getFolderListFromDataContext() {
    let keys = Object.keys(globalData)
    let folderListToShow = []
    keys.forEach((key) => {
      if (globalData[key].type == "folder" && globalData[key].path.includes("DATA")) {
        folderListToShow.push(globalData[key])
      }
    })
    setFolderList(folderListToShow)
  }

  /**
   * @description
   * This functions get all binary files from the DataContext DATA folder and update binaryFileList.
   */
  function getBinaryFileList() {
    let keys = Object.keys(globalData)
    let tmpList = []
    keys.forEach((key) => {
      if (globalData[key].type == "file" && globalData[key].extension == "pkl" && globalData[key].path.includes("DATA")) {
        tmpList.push(globalData[key])
      }
    })
    setBinaryFileList(tmpList)
  }

  /**
   * @description
   * This functions get all the MEDclasses folders from the DataContext DATA folder and update MEDclassesFolderList.
   */
  function getMEDclassesFolderList() {
    let keys = Object.keys(globalData)
    let folderListToShow = []
    keys.forEach((key) => {
      if (globalData[key].type == "folder" && globalData[key].name == "MEDclasses" && globalData[key].path.includes("DATA") && globalData[key]?.parentID && globalData[globalData[key]?.parentID].name == "MEDclasses") {
        folderListToShow.push(globalData[key])
      }
    })
    setMEDclassesFolderList(folderListToShow)
  }

  /**
   *
   * @param {String} path
   * @param {Function} setter
   *
   * @description
   * This functions is called when the MEDclasses or the MEDprofiles'
   * binary file have been generated.
   *
   */
  function getGeneratedElement(path, setter) {
    let keys = Object.keys(globalData)
    keys.forEach((key) => {
      if (globalData[key].path == path) {
        setter(globalData[key])
      }
    })
  }

  /**
   *
   * @param {MedDataObject} folder
   *
   * @description
   * This function is called when the datafolder is updated in order
   * to obtain the csv files matching the MasterTableFormat.
   *
   */
  function getMasterTableFileList(folder) {
    const keys = Object.keys(globalData)
    const matchingDatasetList = []

    // The column names must be 'PatientID', 'Date', 'Time_point' and the others must contains '_'
    const columnsMatchingFormat = (dataframe) => {
      if (dataframe.$columns[0] != "PatientID" || dataframe.$columns[1] != "Date" || dataframe.$columns[2] != "Time_point") {
        return false
      }
      for (let i = 3; i < dataframe.$columns.length; i++) {
        if (!dataframe.$columns[i].includes("_")) {
          return false
        }
      }
      return true
    }

    // The 1st line (after columns) must contains 'string' or 'num' at 1st position, 'datetime.date' at 2nd and 'num' in all others
    const firstLineMatchingFormat = (dataframe) => {
      let firstLine = dataframe.$data[0]
      if ((firstLine[0] != "string" && firstLine[0] != "num") || firstLine[1] != "datetime.date") {
        return false
      }
      for (let i = 2; i < firstLine.length; i++) {
        if (firstLine[i] != "num") {
          return false
        }
      }
      return true
    }

    // The first column (removing 1st line) must contains str or int
    const firstColumnMatchingFormat = (dataframe) => {
      let copy = [...dataframe.$dataIncolumnFormat[0]]
      copy.shift()
      let column = new Series(copy)
      if (column.$dtypes.length == 1 && (column.$dtypes[0] == "int32" || column.$dtypes[0] == "int64" || (column.$dtypes[0] == "string" && column.dt.$dateObjectArray[0] == "Invalid Date"))) {
        return true
      }
      return false
    }

    // The second column (removing 1st line) must contains datetime values
    const secondColumnMatchingFormat = (dataframe) => {
      let copy = [...dataframe.$dataIncolumnFormat[1]]
      copy.shift()
      let column = new Series(copy)
      if (column.$dtypes.length == 1 && column.$dtypes[0] == "string" && column.dt.$dateObjectArray[0] != "Invalid Date") {
        return true
      }
      return false
    }

    // The third column (removing 1st line) must contains null or int values
    const thirdColumnMatchingFormat = (dataframe) => {
      let copy = [...dataframe.$dataIncolumnFormat[2]]
      copy.shift()
      let column = new Series(copy)
      if (column.$dtypes.length == 1 && (column.$dtypes[0] == "int32" || column.$dtypes[0] == "int64")) {
        return true
      }
      return false
    }

    // The others columns (removing 1st line) must contains num values
    const allNumericValues = (dataframe) => {
      let copy = [...dataframe.$data]
      copy.shift()
      let data = new DataFrame(copy)
      for (let i = 3; i < data.$dtypes.length; i++) {
        const columnType = data.$dtypes[i]
        if (columnType != "int32" && columnType != "int64" && columnType != "float32" && columnType != "float64") {
          return false
        }
      }
      return true
    }

    // Load the CSV file in order to check if the data is matching the required format
    const loadCSVFile = (MEDdata) => {
      // Create a promise for each CSV file
      return new Promise((resolve) => {
        loadCSVPath(MEDdata.path, (data) => {
          let dataframe = new DataFrame(data)
          // The dataframe must contain at least 3 columns and respect the format for each column as specified in the checking functions
          if (dataframe.$columns.length > 3 && columnsMatchingFormat(dataframe) && firstLineMatchingFormat(dataframe) && firstColumnMatchingFormat(dataframe) && secondColumnMatchingFormat(dataframe) && thirdColumnMatchingFormat(dataframe) && allNumericValues(dataframe)) {
            matchingDatasetList.push(MEDdata)
          }
          resolve()
        })
      })
    }

    // Create a promises array for all the csv files
    const promises = keys
      .filter((key) => {
        const item = globalData[key]
        return item.type !== "folder" && item.path.includes(folder.path) && item.extension === "csv"
      })
      .map((key) => loadCSVFile(globalData[key]))

    // Wait for all the csv files to have been examinated
    Promise.all(promises)
      .then(() => {
        setMasterTableFileList(matchingDatasetList)
        setLoadingMasterTables(false)
      })
      .catch((error) => {
        toast.error("Error while loading MEDdata :", error)
      })
  }

  /**
   *
   * @param {MedDataObject} folder
   *
   * @description
   * This function is called when the dataFolder is updated in order
   * to obtain the csv files matching the subMasterTableFormat.
   *
   */
  function getSubMasterTableFileList(folder) {
    const keys = Object.keys(globalData)
    const matchingDatasetList = []

    // Load the CSV file in order to check if the data is matching the required format
    const loadCSVFile = (MEDdata) => {
      // The first column must be identifiers
      const firstColumnMatchingFormat = (dataframe) => {
        return dataframe.$dtypes[0] == "int32" || dataframe.$dtypes[0] == "int64" || (dataframe.$dtypes[0] == "string" && dataframe[dataframe.$columns[0]].dt.$dateObjectArray[0] == "Invalid Date")
      }

      // The second column must be date
      const secondColumnMatchingFormat = (dataframe) => {
        return dataframe.$dtypes[1] == "string" && dataframe[dataframe.$columns[1]].dt.$dateObjectArray[0] != "Invalid Date"
      }

      // All the others columns must be numerical features and their columns names must respect the format className_attributeName
      const allOtherColumnsAreNumerical = (dataframe) => {
        for (let i = 2; i < dataframe.$columns.length; i++) {
          const columnType = dataframe.$dtypes[i]
          if ((columnType != "int32" && columnType != "int64" && columnType != "float32" && columnType != "float64") || !dataframe.$columns[i].includes("_")) {
            return false
          }
        }
        return true
      }

      // Create a promise for each CSV file
      return new Promise((resolve) => {
        loadCSVPath(MEDdata.path, (data) => {
          let dataframe = new DataFrame(data)
          // The dataframe must contain at least 3 columns and respect the format for each column as specified in the checking functions
          if (dataframe.$columns.length > 2 && firstColumnMatchingFormat(dataframe) && secondColumnMatchingFormat(dataframe) && allOtherColumnsAreNumerical(dataframe)) {
            matchingDatasetList.push(MEDdata)
          }
          resolve()
        })
      })
    }

    // Create a promises array for all the csv files
    const promises = keys
      .filter((key) => {
        const item = globalData[key]
        return item.type !== "folder" && item.path.includes(folder.path) && item.extension === "csv"
      })
      .map((key) => loadCSVFile(globalData[key]))

    // Wait for all the csv files to have been examinated
    Promise.all(promises)
      .then(() => {
        setSubMasterTableFileList(matchingDatasetList)
        setLoadingSubMasterTables(false)
      })
      .catch((error) => {
        toast.error("Error while loading MEDdata :", error)
      })
  }

  /**
   * @description
   * Open the MEDprofilesViewerPage, depending on generatedClassesFolder and generatedMEDprofilesFile
   */
  function openMEDprofilesViewer() {
    dispatchLayout({ type: `openMEDprofilesViewerModule`, payload: { pageId: "MEDprofilesViewer", MEDclassesFolder: generatedClassesFolder, MEDprofilesBinaryFile: generatedMEDprofilesFile } })
  }

  /**
   * @description
   * Calls the create_master_table method in the MEDprofiles server
   */
  const createMasterTable = () => {
    // Get paths of the MedDataObjects
    let keys = Object.keys(selectedSubMasterTableFiles)
    let csvPaths = []
    keys.forEach((key) => {
      csvPaths.push(selectedSubMasterTableFiles[key].path)
    })
    // Run extraction process
    requestJson(
      port,
      "/MEDprofiles/create_master_table",
      {
        csvPaths: csvPaths,
        masterTableFolder: MEDprofilesFolderPath + MedDataObject.getPathSeparator() + "master_tables",
        filename: masterFilename
      },
      (jsonResponse) => {
        console.log("received results:", jsonResponse)
        if (!jsonResponse.error) {
          MedDataObject.updateWorkspaceDataObject()
          setGeneratedMasterPath(jsonResponse["master_table_path"])
        } else {
          toast.error(`Creation failed: ${jsonResponse.error.message}`)
          setError(jsonResponse.error)
        }
      },
      function (err) {
        console.error(err)
        toast.error(`Creation failed: ${err}`)
      }
    )
  }

  /**
   * @description
   * This function calls the create_MEDclasses method in the MEDprofiles server
   */
  const createMEDclasses = () => {
    setCreatingMEDclasses(true)
    // Run extraction process
    requestJson(
      port,
      "/MEDprofiles/create_MEDclasses",
      {
        masterTablePath: selectedMasterTable.path,
        MEDprofilesFolderPath: MEDprofilesFolderPath
      },
      (jsonResponse) => {
        console.log("received results:", jsonResponse)
        if (!jsonResponse.error) {
          MedDataObject.updateWorkspaceDataObject()
          setGeneratedClassesFolderPath(jsonResponse["generated_MEDclasses_folder"])
        } else {
          toast.error(`Creation failed: ${jsonResponse.error.message}`)
          setError(jsonResponse.error)
        }
        setCreatingMEDclasses(false)
      },
      function (err) {
        console.error(err)
        toast.error(`Creation failed: ${err}`)
        setCreatingMEDclasses(false)
      }
    )
  }

  /**
   * @description
   * This function calls the create_MEDprofiles_folder method in the MEDprofiles server
   */
  const createMEDprofilesFolder = () => {
    // Run extraction process
    requestJson(
      port,
      "/MEDprofiles/create_MEDprofiles_folder",
      {
        rootDataFolder: rootDataFolder.path
      },
      (jsonResponse) => {
        console.log("received results:", jsonResponse)
        if (!jsonResponse.error) {
          MedDataObject.updateWorkspaceDataObject()
          setMEDprofilesFolderPath(jsonResponse["MEDprofiles_folder"])
        } else {
          toast.error(`Creation failed: ${jsonResponse.error.message}`)
          setError(jsonResponse.error)
        }
      },
      function (err) {
        console.error(err)
        toast.error(`Creation failed: ${err}`)
      }
    )
  }

  /**
   *
   * @param {String} name
   *
   * @description
   * Called when the user change the name under which the master table
   * file will be saved.
   *
   */
  const handleMasterFilenameChange = (name) => {
    if (name.match("^[a-zA-Z0-9_]+.csv$") != null) {
      setMasterFilename(name)
    }
  }

  /**
   *
   * @param {String} name
   *
   * @description
   * Called when the user change the name under which the master table
   * file will be saved.
   *
   */
  const handleBinaryFilenameChange = (name) => {
    if (name.match("^[a-zA-Z0-9_]+.pkl$") != null) {
      setBinaryFilename(name)
    }
  }

  /**
   * @description
   * This function calls the instantiate_MEDprofiles method in the MEDprofiles server
   */
  const instantiateMEDprofiles = () => {
    setInstantiatingMEDprofiles(true)
    setShowProgressBar(true)
    // Run extraction process
    requestJson(
      port,
      "/MEDprofiles/instantiate_MEDprofiles",
      {
        masterTablePath: selectedMasterTable.path,
        MEDprofilesFolderPath: MEDprofilesFolderPath,
        filename: binaryFilename
      },
      (jsonResponse) => {
        console.log("received results:", jsonResponse)
        if (!jsonResponse.error) {
          MedDataObject.updateWorkspaceDataObject()
          setGeneratedMEDprofilesFilePath(jsonResponse["generated_file_path"])
        } else {
          toast.error(`Instantiation failed: ${jsonResponse.error.message}`)
          setError(jsonResponse.error)
        }
        setShowProgressBar(false)
        setInstantiatingMEDprofiles(false)
      },
      function (err) {
        console.error(err)
        toast.error(`Instantiation failed: ${err}`)
        setShowProgressBar(false)
        setInstantiatingMEDprofiles(false)
      }
    )
  }

  // Look of items in the MEDclasses DataView
  const MEDclassesDisplay = (element) => {
    return <div>{globalData[element]?.nameWithoutExtension}</div>
  }

  // Called when dataFolder is updated, in order to load the matching files for submastertable and mastertable
  useEffect(() => {
    if (dataFolder !== null) {
      setLoadingMasterTables(true)
      setLoadingSubMasterTables(true)
      setSubMasterTableFileList([])
      setMasterTableFileList([])
      getSubMasterTableFileList(dataFolder)
      getMasterTableFileList(dataFolder)
    } else {
      setSelectedSubMasterTableFiles(null)
      setSelectedMasterTable(null)
    }
  }, [dataFolder])

  // Called while global data is updated in order to get the DATA folder, to update the available folder list,
  // to set default selected folder to "MEDprofiles/master_tables" or "extracted_features" if one of the folder exists
  // and to get the generated classes folder and the MEDprofiles binary file
  useEffect(() => {
    if (globalData !== undefined) {
      getFolderListFromDataContext()
      getBinaryFileList()
      getMEDclassesFolderList()
      if (generatedClassesFolderPath) {
        getGeneratedElement(generatedClassesFolderPath, setGeneratedClassesFolder)
      }
      if (generatedMEDprofilesFilePath) {
        getGeneratedElement(generatedMEDprofilesFilePath, setGeneratedMEDprofilesFile)
      }
      let keys = Object.keys(globalData)
      keys.forEach((key) => {
        if (globalData[key].type == "folder" && globalData[key].name == "master_tables" && globalData[key].path?.includes("DATA") && globalData[key].path?.includes("MEDprofiles") && globalData[key].childrenIDs?.length > 0) {
          setDataFolder(globalData[key])
        } else if (dataFolder == null && globalData[key].type == "folder" && globalData[key].name == "extracted_features" && globalData[key].path?.includes("DATA")) {
          setDataFolder(globalData[key])
        } else if (globalData[key].type == "folder" && globalData[key].name == "DATA" && globalData[key].parentID == "UUID_ROOT") {
          setRootDataFolder(globalData[key])
        }
      })
    }
  }, [globalData])

  // Called while rootDataFolder is updated in order to create the MEDprofiles folder
  useEffect(() => {
    if (rootDataFolder) {
      createMEDprofilesFolder()
    }
  }, [rootDataFolder])

  return (
    <>
      <div>
        <div className="margin-top-15 centered-container">
          <h5>Select the location of your master table data folder &nbsp;</h5>
          <div className="margin-top-15">{folderList.length > 0 ? <Dropdown value={dataFolder} options={folderList} filter optionLabel="name" onChange={(event) => setDataFolder(event.value)} placeholder="Select a folder" /> : <Dropdown placeholder="No folder to show" disabled />}</div>
        </div>
        <hr></hr>
        <div className="margin-top-15">
          <h5 className="align-center">Create or Select your master table</h5>
          <div className="align-center">
            <Message severity="info" text="Only the files matching the required format will be shown" />
          </div>
        </div>
        <div className="margin-top-15 flex-container">
          <div className="mergeToolMultiSelect flex-container">
            <div>{loadingSubMasterTables == true && <ProgressSpinner style={{ width: "40px", height: "40px" }} />}</div>
            <div>{subMasterTableFileList?.length > 0 ? <MultiSelect style={{ width: "300px" }} value={selectedSubMasterTableFiles} onChange={(e) => setSelectedSubMasterTableFiles(e.value)} options={subMasterTableFileList} optionLabel="name" className="w-full md:w-14rem margintop8px" display="chip" placeholder="Select CSV files" /> : loadingSubMasterTables == true ? <MultiSelect placeholder="Loading..." disabled /> : <MultiSelect placeholder="No CSV files to show" disabled />}</div>
            <div>
              <Button disabled={!selectedSubMasterTableFiles || selectedSubMasterTableFiles?.length < 1} onClick={createMasterTable}>
                Create Master Table
              </Button>
            </div>
          </div>
          <div>
            Save master table as : &nbsp;
            <InputText value={masterFilename} onChange={(e) => handleMasterFilenameChange(e.target.value)} />
          </div>
          <div className="vertical-divider"></div>
          <div>{loadingMasterTables == true && <ProgressSpinner style={{ width: "40px", height: "40px" }} />}</div>
          <div>{masterTableFileList.length > 0 ? <Dropdown value={selectedMasterTable} options={masterTableFileList} optionLabel="name" onChange={(event) => setSelectedMasterTable(event.value)} placeholder="Select a master table" /> : loadingMasterTables == true ? <Dropdown placeholder="Loading..." disabled /> : <Dropdown placeholder="No CSV files to show" disabled />}</div>
        </div>
        <div className="margin-top-15">{generatedMasterPath && <>Master Table generated at : {generatedMasterPath}</>}</div>
      </div>
      <hr></hr>
      <div className="centered-container">
        <Button disabled={!selectedMasterTable || creatingMEDclasses} onClick={createMEDclasses}>
          Create MEDclasses
        </Button>
      </div>
      {generatedClassesFolder?.childrenIDs && (
        <div className="card data-view">
          <DataView value={generatedClassesFolder.childrenIDs} itemTemplate={MEDclassesDisplay} paginator rows={5} header="Generated MEDclasses" style={{ textAlign: "center" }} />
        </div>
      )}
      <hr></hr>
      <div className="margin-top-15 flex-container">
        <div>
          Save MEDprofiles binary file as : &nbsp;
          <InputText value={binaryFilename} onChange={(e) => handleBinaryFilenameChange(e.target.value)} />
        </div>
        <div>
          <Button disabled={!selectedMasterTable || instantiatingMEDprofiles || !generatedClassesFolder?.childrenIDs} onClick={instantiateMEDprofiles}>
            Instantiate MEDprofiles
          </Button>
        </div>
      </div>
      <div className="margin-top-15 extraction-progress">{showProgressBar && <ProgressBarRequests progressBarProps={{}} isUpdating={showProgressBar} setIsUpdating={setShowProgressBar} progress={progress} setProgress={setProgress} requestTopic={"/MEDprofiles/progress"} />}</div>
      <hr></hr>
      <h5 className="margin-top-15 align-center">Visualize your MEDprofiles data</h5>
      <div className="margin-top-15 flex-container">
        <div>
          MEDclasses folder : &nbsp;
          {MEDclassesFolderList.length > 0 ? <Dropdown style={{ width: "250px" }} value={generatedClassesFolder} options={MEDclassesFolderList} onChange={(event) => setGeneratedClassesFolder(event.value)} optionLabel="path" placeholder="Select your MEDclasses folder" /> : <Dropdown placeholder="No Folder to show" disabled />}
        </div>
        <div>
          MEDprofiles binary file : &nbsp;
          {binaryFileList.length > 0 ? <Dropdown style={{ width: "250px" }} value={generatedMEDprofilesFile} options={binaryFileList} onChange={(event) => setGeneratedMEDprofilesFile(event.value)} optionLabel="name" placeholder="Select your MEDprofiles binary file" /> : <Dropdown placeholder="No file to show" disabled />}
        </div>
        <div>
          <Button disabled={!generatedClassesFolder || !generatedMEDprofilesFile} onClick={openMEDprofilesViewer}>
            Open MEDprofiles Viewer
          </Button>
        </div>
      </div>
    </>
  )
}

export default MEDprofilesPrepareData