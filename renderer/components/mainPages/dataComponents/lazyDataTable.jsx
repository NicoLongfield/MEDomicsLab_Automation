import React, { useContext, useState, useEffect } from "react"
import { DataContext } from "../../workspace/dataContext"
import { ListBox } from "primereact/listbox"
import DataTableFromContext from "./dataTableFromContext"
import { Tab, Tabs } from "react-bootstrap"
import { ScrollPanel } from "primereact/scrollpanel"
import { Divider } from "@blueprintjs/core"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
/**
 * @description - This component is the dataset selector component that will show the datasets available in the workspace
 * @returns the dataset selector component
 * @param {Object} props - The props object
 *  @param {Object} props.keepOnlyFolder - The only parent folder to keep in the dataset selector
 */
const LazyDataTable = () => {
  const { globalData } = useContext(DataContext) // We get the global data from the context to retrieve the directory tree of the workspace, thus retrieving the data files
  const [datasetList, setDatasetList] = useState([])
  const [selectedDatasets, setSelectedDatasets] = useState([])
  const [tabMenuItems, setTabMenuItems] = useState([{ label: "Dataset", icon: "pi pi-fw pi-file" }])
  const [isLazyLoaded, setIsLazyLoaded] = useState(false)

  const [data, setData] = useState([])
  const [first, setFirst] = useState(0)
  const [rows, setRows] = useState(10)
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)

  const lazyLoadData = (event) => {
    setLoading(true)

    // Calculate the page number and number of records to fetch
    const page = event.first / event.rows + 1
    const pageSize = event.rows

    // Read the file using the fs module
    const fileData = fs.readFileSync("path/to/file.json", "utf8")

    // Parse the file data using DanfoJS-Node
    const df = danfo.DataFrame(fileData)

    // Slice the data to get the current page
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const slicedData = df.iloc(startIndex, endIndex).values

    // Update the state with the fetched data
    setData(slicedData)
    setTotalRecords(df.shape[0])
    setLoading(false)

    // Update the state with the current page and number of records
    setFirst(event.first)
    setRows(event.rows)
  }

  function generateDatasetListFromDataContext(dataContext) {
    let keys = Object.keys(dataContext)
    let datasetListToShow = []
    keys.forEach((key) => {
      if (dataContext[key].type !== "folder") {
        datasetListToShow.push(dataContext[key])
      }
    })
    setDatasetList(datasetListToShow)
  }

  useEffect(() => {
    if (globalData !== undefined) {
      generateDatasetListFromDataContext(globalData)
    }
  }, [globalData])

  useEffect(() => {
    console.log("tabMenuItems", tabMenuItems)
  }, [tabMenuItems])

  return (
    <>
      <h1>Dataset Selector</h1>
      <>
        <ListBox
          value={selectedDatasets}
          onChange={(e) => {
            console.log(e.value)
            setSelectedDatasets(e.value)
          }}
          options={datasetList}
          optionLabel="name"
          className="listbox-multiple w-full md:w-14rem"
        />
        <Divider />
        <>{console.log("TEST", selectedDatasets)}</>

        <>
          {isLazyLoaded && (
            <DataTable value={data} totalRecords={totalRecords} lazy first={first} rows={rows} loading={loading} onPage={lazyLoadData}>
              <Column field="id" header="ID" />
              <Column field="name" header="Name" />
              <Column field="email" header="Email" />
            </DataTable>
          )}
        </>
      </>
    </>
  )
}

export default LazyDataTable
