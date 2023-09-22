import React, { useContext, useState, useEffect } from "react"
import { DataContext } from "../../workspace/dataContext"
import { ListBox } from "primereact/listbox"
import DataTableFromContext from "./dataTableFromContext"
import { Tab, Tabs } from "react-bootstrap"
import { ScrollPanel } from "primereact/scrollpanel"
import { Divider } from "@blueprintjs/core"
import { InputText } from "primereact/inputtext"

import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
var dataforge = require("data-forge-fs")
console.log("dataforge", dataforge)
/**
 * @description - This component is the dataset selector component that will show the datasets available in the workspace
 * @returns the dataset selector component
 * @param {Object} props - The props object
 *  @param {Object} props.keepOnlyFolder - The only parent folder to keep in the dataset selector
 */
const LazyDataTable = ({
  path = "C:\\Users\\nicol\\Downloads\\WS\\DATA\\customer_data.csv"
}) => {
  const [globalFilterValue, setGlobalFilterValue] = useState("")

  const { globalData } = useContext(DataContext) // We get the global data from the context to retrieve the directory tree of the workspace, thus retrieving the data files
  const [isLazyLoaded, setIsLazyLoaded] = useState(false)
  const [columns, setColumns] = useState([])

  const [data, setData] = useState([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState(null)
  const [iDs, setIDs] = useState(null)
  const [selectAll, setSelectAll] = useState(false)
  const [selectedRows, setselectedRows] = useState(null)
  const [lazyState, setlazyState] = useState({
    first: 0,
    rows: 10,
    page: 1,
    sortField: null,
    sortOrder: null,
    filters: null
  })
  const [lazyFilters, setLazyFilters] = useState({})

  function createObjectsFromDataset(dataset, columnNames) {
    return dataset.map((row) => {
      return row.reduce((obj, value, index) => {
        obj[columnNames[index]] = value
        return obj
      }, {})
    })
  }

  let networkTimeout = null

  useEffect(() => {
    loadLazyData()
  }, [])

  useEffect(() => {
    console.log("DATA", data)
  }, [data])

  const onGlobalFilterChange = (e) => {
    const value = e.target.value
    let _filters = { ...filters }

    _filters["global"].value = value

    setLazyFilters(_filters)
    setGlobalFilterValue(value)
  }

  const loadLazyData = () => {
    setLoading(true)

    if (networkTimeout) {
      clearTimeout(networkTimeout)
    }

    if (!isLazyLoaded) {
      //imitate delay of a backend call
      networkTimeout = setTimeout(
        () => {
          dataforge
            .readFile(path)
            .parseCSV({ dynamicTyping: true })
            .then((data) => {
              const columnNames = data.content.columnNames
              const rows = data.content.values.rows
              const dataObjects = createObjectsFromDataset(rows, columnNames)
              setData(dataObjects)
              setColumns(columnNames)
              setTotalRecords(rows.length)
              setLoading(false)
              setIsLazyLoaded(true)

              let newfilters = getFiltersFromColumns(columnNames)
              setLazyFilters(newfilters)
            })
        },
        Math.random() * 1000 + 250
      )
    }
  }

  const renderHeader = () => {
    return (
      <div className="flex justify-content-end">
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder="Keyword Search"
          />
        </span>
      </div>
    )
  }

  function getFiltersFromColumns(columns) {
    const filters = {}
    for (let col of columns) {
      filters[col] = { value: "", matchMode: "contains" }
    }
    return filters
  }

  const onPage = (event) => {
    setlazyState(event)
  }

  const onSort = (event) => {
    setlazyState(event)
  }

  const onFilter = (event) => {
    event["first"] = 0
    setlazyState(event)
  }

  const onSelectionChange = (event) => {
    const value = event.value

    setselectedRows(value)
    // setSelectAll(value.length === totalRecords)
  }

  const onSelectAllChange = (event) => {
    const selectAll = event.checked

    if (selectAll) {
      //   CustomerService.getCustomers().then((data) => {
      //     setSelectAll(true)
      //     setselectedRows(data.customers)
      //   })
    } else {
      setSelectAll(false)
      setselectedRows([])
    }
  }

  return (
    <>
      <>{console.log("TEST")}</>

      <>
        {isLazyLoaded && (
          <DataTable
            header={renderHeader}
            resizableColumns
            showGridlines
            style={{ width: "100%", height: "85%" }}
            className="lazy-datatable"
            size={"small"}
            value={data}
            filterDisplay="row"
            dataKey="id"
            first={lazyState.first}
            totalRecords={totalRecords}
            onPage={onPage}
            onSort={onSort}
            sortField={lazyState.sortField}
            sortOrder={lazyState.sortOrder}
            onFilter={onFilter}
            filters={lazyFilters}
            loading={loading}
            selection={selectedRows}
            onSelectionChange={onSelectionChange}
            selectAll={selectAll}
            onSelectAllChange={onSelectAllChange}
          >
            {columns.map((col) => (
              <Column
                key={col}
                field={col}
                header={col}
                sortable
                filter
                filterPlaceholder="Search"
                filterMenuStyle={{ width: "10rem" }}
              />
            ))}
          </DataTable>
        )}
      </>
    </>
  )
}

export default LazyDataTable
