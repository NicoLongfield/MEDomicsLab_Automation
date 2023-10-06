import * as React from "react"
import { Button } from "primereact/button"
import { Menu, MenuItem, Intent, HotkeysTarget2, HotkeysDialog2, Checkbox, Divider, Collapse, Icon } from "@blueprintjs/core"
import xlxs from "xlsx"
// import { Example, ExampleProps } from "@blueprintjs/docs-theme"
import {
  Cell,
  Column,
  ColumnHeaderCell,
  CopyCellsMenuItem,
  MenuContext,
  SelectionModes,
  Table2,
  Utils,
  EditableCell2
} from "@blueprintjs/table"
import { waitUntilSymbol } from "next/dist/server/web/spec-extension/fetch-event"
import { Accordion, Form, Stack } from "react-bootstrap"
import {
  ChevronBarRight,
  ChevronCompactRight,
  ChevronRight,
  FiletypeCsv,
  FiletypeJson,
  FiletypeXlsx
} from "react-bootstrap-icons"
import { PiFloppyDisk } from "react-icons/pi"
import { toast } from "react-toastify"
const dfd = require("danfojs-node")
import { DataFrame, Utils as danfoUtils } from "danfojs-node"
import { DataTablePopoverBP } from "./dataTablePopoverBPClass"
import { DataTableHeaderCell } from "./dataTableHeaderCell"
const dfUtils = new danfoUtils()
// eslint-disable-next-line @typescript-eslint/no-var-requires

export type CellLookup = (rowIndex: number, columnIndex: number) => any
export type SortCallback = (columnIndex: number, comparator: (a: any, b: any) => number) => void

export interface SortableColumn {
  getColumn(getCellRenderer: CellLookup, getCellData: CellLookup, sortColumn: SortCallback): JSX.Element
}

abstract class AbstractSortableColumn implements SortableColumn {
  constructor(
    protected name: string,
    protected index: number,
    protected category?: string,
    protected config: { [key: string]: any } = {}
  ) {}

  public getColumn(getCellRenderer: CellLookup, getCellData: CellLookup, sortColumn: SortCallback) {
    // const cellRenderer = (rowIndex: number, columnIndex: number) => <Cell>{getCellData(rowIndex, columnIndex)}</Cell>
    const menuRenderer = this.renderMenu.bind(this, sortColumn)
    // const columnHeaderRender = th
    const columnHeaderCellRenderer = () => (
      // <DataTableHeaderCell name={this.name} menuRenderer={menuRenderer} config={this.config} category={this.category} />

      <ColumnHeaderCell name={this.name} menuRenderer={menuRenderer}>
        <DataTablePopoverBP config={this.config} category={this.category} columnName={this.name} />
      </ColumnHeaderCell>
    )

    return (
      <Column
        cellRenderer={getCellRenderer}
        columnHeaderCellRenderer={columnHeaderCellRenderer}
        key={this.index}
        name={this.name}
      />
    )
  }

  protected abstract renderMenu(sortColumn: SortCallback): JSX.Element
}

class TextSortableColumn extends AbstractSortableColumn {
  protected renderMenu(sortColumn: SortCallback) {
    const sortAsc = () => sortColumn(this.index, (a, b) => this.compare(a, b))
    const sortDesc = () => sortColumn(this.index, (a, b) => this.compare(b, a))
    return (
      <Menu>
        <MenuItem icon="sort-asc" onClick={sortAsc} text="Sort Asc" />
        <MenuItem icon="sort-desc" onClick={sortDesc} text="Sort Desc" />
      </Menu>
    )
  }

  private compare(a: any, b: any) {
    return a.toString().localeCompare(b)
  }
}

class NumericalSortableColumn extends AbstractSortableColumn {
  protected renderMenu(sortColumn: SortCallback) {
    const sortAsc = () => sortColumn(this.index, (a, b) => this.compare(a, b))
    const sortDesc = () => sortColumn(this.index, (a, b) => this.compare(b, a))
    return (
      <>
        <Menu>
          <MenuItem icon="sort-asc" onClick={sortAsc} text="Sort Asc" />
          <MenuItem icon="sort-desc" onClick={sortDesc} text="Sort Desc" />
          <Divider />
          <MenuItem icon="filter" text="Type">
            <MenuItem icon="array-floating-point" text="Numerical" />
            <MenuItem icon="array-numeric" text="Categorical" />
            <MenuItem icon="array-timestamp" text="Time" />
            <MenuItem icon="array-string" text="String" />
          </MenuItem>
        </Menu>
      </>
    )
  }

  private compare(a: any, b: any) {
    return parseFloat(a) - parseFloat(b)
  }
}

export class DataTableWrapperBPClass extends React.PureComponent<{}, {}> {
  data: any
  ref: React.RefObject<unknown>
  constructor(props: {} | Readonly<{}>) {
    super(props)
    console.log("props", props)
    this.ref = React.createRef()
    //React.createRef()
  }

  public state = {
    columnsNames: [] as string[], // this.getColumnNames(this.props.data),
    columns: [] as SortableColumn[],
    data: this.props.data as any[],
    sortedIndexMap: [] as number[],
    columnIndexMap: [] as number[],
    sparseCellData: {} as { [key: string]: string },
    sparseCellIntent: {} as { [key: string]: Intent },
    options: {
      isEditable: true,
      isReorderable: false,
      exportToCSV: true,
      exportToJSON: true,
      exportToExcel: true,
      exportToPDF: true,
      fileName: this.props.options ? this.props.options.fileName : "data",
      isOpen: false,
      hasBeenModified: false
    },
    config: { ...this.props.config }
  }

  public getData() {
    let data = this.data
    console.log(data)
  }

  public getColumnNames(data: any) {
    let columnsNames = Object.keys(data[0])
    return columnsNames
  }

  public getColumnsTypes(data: any) {
    let columnsNames = Object.keys(data[0])
    let columnsTypes = []
    let firstRows = data.slice(0, 10)
    columnsNames.forEach((columnName) => {
      let arr = firstRows.map((row: { [x: string]: any }) => (row[columnName] === "NaN" ? 0 : row[columnName]))
      let columnType = dfUtils.inferDtype(arr)
      columnsTypes.push(columnType)
    })
    return columnsTypes
  }

  public getDataFrame() {
    let df = new dfd.DataFrame(this.state.data)
    return df
  }

  public getNumberOfUniqueValues(dataframe: DataFrame, columnName: string) {
    let uniqueValues = dataframe.unique(columnName)
    return uniqueValues.length
  }

  public componentDidMount() {
    if (!this.props.data) {
      return
    }
    let columnsNames = Object.keys(this.props.data[0])
    let newColumns = []
    let newColumnIndexMap = []
    let newColumnTypes = this.getColumnsTypes(this.props.data)
    columnsNames.forEach((columnName, index) => {
      newColumns.push(new NumericalSortableColumn(columnName, index, newColumnTypes[index]))
      newColumnIndexMap.push(index)
    })
    this.state.columnsNames = columnsNames
    this.state.columns = newColumns
    this.setState({ data: this.props.data })
    this.setState({ columnsNames: columnsNames, columns: newColumns, columnIndexMap: newColumnIndexMap })
    console.log("componentDidMount", this.state.data, this.state.sortedIndexMap)
  }

  public componentDidUpdate(prevProps: any, prevState: any) {
    if (!this.props.data) {
      return
    }
    if (prevProps !== this.props) {
      // if (!this.props.data) {
      this.setState({ data: this.props.data })
      let columnsNames = Object.keys(this.props.data[0])
      let newColumns = []
      let newColumnIndexMap = []
      let newColumnTypes = this.getColumnsTypes(this.props.data)
      columnsNames.forEach((columnName, index) => {
        newColumns.push(new NumericalSortableColumn(columnName, index, newColumnTypes[index], this.state.config))
        newColumnIndexMap.push(index)
      })
      this.describeColumns(this.props.data)
      this.setState({ columnsNames: columnsNames, columns: newColumns, columnIndexMap: newColumnIndexMap })
      // }
    }
    if (prevState !== this.state) {
      if (prevState.data !== this.state.data) {
        this.setState({ data: this.state.data })
      }
      if (prevState.columns !== this.state.columns) {
        this.setState({ columns: this.state.columns })
      }
    }

    // console.log("componentDidUpdate", this.state.data, this.state.sortedIndexMap)
  }

  /**
   * @description This function returns the modified data with the sparse cell data
   * @param data - data to be modified
   * @returns modifiedData - modified data with the sparse cell data
   */
  public getModifiedData(data: any[]) {
    let modifiedData = []
    let headers = Object.keys(data[0])
    const { sparseCellData } = this.state
    data.forEach((row: { [x: string]: any }, index: any) => {
      let newRow = {}
      headers.forEach((header) => {
        if (sparseCellData[`${index}-${header}`]) {
          newRow[header] = sparseCellData[`${index}-${header}`]
        } else {
          newRow[header] = row[header]
        }
      })
      modifiedData.push(newRow)
    })
    return modifiedData
  }

  /**
   * @description This function exports the data to CSV
   * @param event - event
   * @param data - data to be exported
   */
  public exportToCSV(event: React.MouseEvent<HTMLButtonElement, MouseEvent>, data: any) {
    // let data = this.state.data
    data = this.getModifiedData(data)
    console.log("exportToCSV", data)
    let csvContent = "data:text/csv;charset=utf-8,"
    let headers = Object.keys(data[0])
    let firstRow = headers.join(",")
    csvContent += firstRow + "\r\n"
    let length = data.length
    data.forEach(function (rowArray: { [x: string]: string }, rowindex: number) {
      let rowToPush = ""
      headers.forEach((header, index) => {
        rowToPush += rowArray[header]
        if (index !== headers.length - 1) {
          rowToPush += ","
        } else if (rowindex !== length - 1) {
          rowToPush += "\r\n"
        } else {
          rowToPush += ""
        }
      })
      csvContent += rowToPush
    })
    var encodedUri = encodeURI(csvContent)
    var link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "my_data.csv")
    document.body.appendChild(link) // Required for FF
    link.click()
    link.remove()
  }

  /**
   * @description This function formats the JSON string to be exported to JSON
   * @param json - JSON string to be formatted
   * @returns formattedJSON - formatted JSON string
   */
  public formatJSON(json: string) {
    let formattedJSON = ""
    let indentLevel = 0
    for (let index = 0; index < json.length; index++) {
      const element = json[index]
      if (element === "[") {
        indentLevel++
        formattedJSON += "[\r\n"
        for (let i = 0; i < indentLevel; i++) {
          formattedJSON += "\t"
        }
      } else if (element === "]") {
        indentLevel--
        formattedJSON += "\r\n"
        for (let i = 0; i < indentLevel; i++) {
          formattedJSON += "\t"
        }
        formattedJSON += "]"
      } else if (element === "{") {
        indentLevel++
        formattedJSON += "{\r\n"
        for (let i = 0; i < indentLevel; i++) {
          formattedJSON += "\t"
        }
      } else if (element === "}") {
        indentLevel--
        formattedJSON += "\r\n"
        for (let i = 0; i < indentLevel; i++) {
          formattedJSON += "\t"
        }
        formattedJSON += "}"
      } else if (element === ",") {
        formattedJSON += ",\r\n"
        for (let i = 0; i < indentLevel; i++) {
          formattedJSON += "\t"
        }
      } else {
        formattedJSON += element
      }
    }
    return formattedJSON
  }

  public describeColumns() {
    if (this.state.data) {
      let df = new dfd.DataFrame(this.state.data)

      console.log("describeColumns", df)
      let columnsNames = Object.keys(this.props.data[0])

      columnsNames.forEach((columnName) => {
        // let columnsDescription = df.describe()
        let column = df.$getColumnData(columnName)
        try {
          console.log(column.asType(dfUtils.unique).dropNa().describe().print())
          let uniqueValues = dfUtils.unique(column)
          console.log("uniqueValues", uniqueValues)
        } catch (e) {
          console.log(e)
        }
      })
    }
    //   // let arr = data.map((row: { [x: string]: any }) => (row[columnName] === "NaN" ? 0 : row[columnName]))
    //   // let columnType = dfUtils.inferDtype(arr)
    //   // columnsTypes.push(columnType)
    // })
  }

  /**
   * @description This function exports the data to JSON
   * @param event - event
   * @param data - data to be exported
   */
  public exportToJSON(event: React.MouseEvent<HTMLButtonElement, MouseEvent>, data: any) {
    data = this.getModifiedData(data)
    console.log("exportToJSON", data)
    let jsonContent = "data:text/json;charset=utf-8, \r\n[\r\n\t"
    data.forEach((row: { [x: string]: string }, index: number) => {
      jsonContent += JSON.stringify(row)
      if (index !== data.length - 1) {
        jsonContent += ","
      } else {
        jsonContent += ""
      }
    })
    jsonContent += "\r\n] \r\n"
    var encodedUri = encodeURI(this.formatJSON(jsonContent))
    var link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "my_data.json")
    document.body.appendChild(link) // Required for FF
    link.click()
    link.remove()
  }

  /**
   * @description This function exports the data to Excel
   * @param event - event
   * @param data - data to be exported
   */
  public exportToExcel(event: React.MouseEvent<HTMLButtonElement, MouseEvent>, data: any, filePath?: string) {
    // let data = this.state.data
    data = this.getModifiedData(data)
    console.log("exportToExcel", data)
    let headers = Object.keys(data[0])
    let length = data.length
    let excelData = []
    excelData.push(headers)
    data.forEach((row: { [x: string]: string }, index: number) => {
      let rowToPush = []
      headers.forEach((header) => {
        rowToPush.push(row[header])
      })
      excelData.push(rowToPush)
    })
    const ws = xlxs.utils.aoa_to_sheet(excelData)
    const wb = xlxs.utils.book_new()
    xlxs.utils.book_append_sheet(wb, ws, "SheetJS")
    if (filePath) {
      const path = require("path")
      const finalPath = path.join(filePath, "my_data.xlsx")
      console.log("finalPath", finalPath)
    }
    xlxs.writeFile(wb, "my_data.xlsx")
  }

  /**
   * This function saves the modified data in the format specified in the config and at the location specified in the config
   * @param event - event
   * @param data - data to be saved
   * @returns void
   */
  public async saveData(event: React.MouseEvent<HTMLButtonElement, MouseEvent>, data: any) {
    // let data = this.state.data
    data = this.getModifiedData(data)
    let df = new dfd.DataFrame(data)
    // data = new dfd.DataFrame(data)
    console.log("saveData", data)
    console.log("saveData", this.state.config)
    let modificationSuccess = false
    if (this.state.config.extension === "csv") {
      try {
        dfd.toCSV(df, { filePath: this.state.config.path })
      } catch (e) {
        console.log(e)
      } finally {
        toast.success("Data saved successfully")
      }

      // toast.success("Data saved successfully")
    } else if (this.state.config.extension === "json") {
      try {
        dfd.toJSON(df, { filePath: this.state.config.path })
      } catch (e) {
        console.log(e)
      } finally {
        toast.success("Data saved successfully")
      }
      // this.exportToJSON(event, data)
    } else if (this.state.config.extension === "xlsx") {
      try {
        dfd.toExcel(df, { filePath: this.state.config.path })
      } catch (e) {
        console.log(e)
      } finally {
        toast.success("Data saved successfully")
      }
    }
  }

  public render() {
    const { data } = this.state
    if (!data) {
      return <div>Loading...</div>
    }
    // console.log(this.getDataFrame())
    // console.log("title", this.state.config)
    const numRows = this.state.data.length
    const columns = this.state.columns.map((col) => col.getColumn(this.getCellRenderer, this.getCellData, this.sortColumn))
    // this.props.setGlobalData(this.getDataFrame())
    return (
      <div className="bp-datatable-wrapper">
        <ChevronRight
          className={`bp-datatable-wrapper-options-icon ${
            this.state.options.isOpen
              ? "bp-datatable-wrapper-options-icon-open rotate-90-cw"
              : "bp-datatable-wrapper-options-icon-closed rotate--90-cw"
          }`}

          // style={{ display: "block", padding: "0.25rem", margin: "1rem", color: "#3f3f3f3", border: "none", zIndex: 1000 }}
        />
        <div
          className="bp-datatable-wrapper-title"
          style={{ display: "flex", flexDirection: "horizontal" }}
          onMouseEnter={() => this.setState({ options: { ...this.state.options, isOpen: true } })}
          onMouseLeave={() => this.setState({ options: { ...this.state.options, isOpen: false } })}
        >
          <Collapse isOpen={this.state.options.isOpen}>
            <Stack direction="horizontal" gap={3} style={{ position: "relative", top: "-5px", right: "0px" }}>
              <Button
                onClick={(e) => {
                  this.saveData(e, data)
                }}
                icon={<PiFloppyDisk size={"1.5rem"} />}
                rounded
                className="p-button-secondary ms-auto"
                style={{ marginTop: "5px", marginBottom: "5px", padding: "0rem", height: "2.5rem", width: "2.5rem" }}
                disabled={!this.state.options.isEditable}
              />
              <Button
                onClick={(e) => {
                  this.exportToCSV(e, data)
                }}
                icon={<FiletypeCsv size={"1.5rem"} />}
                rounded
                className="p-button-secondary ms-auto"
                style={{ marginTop: "5px", marginBottom: "5px", padding: "0rem", height: "2.5rem", width: "2.5rem" }}
                disabled={!this.state.options.isEditable}
              />
              <Button
                onClick={(e) => {
                  this.exportToJSON(e, data)
                }}
                icon={<FiletypeJson size={"1.5rem"} />}
                rounded
                className="p-button-info"
                style={{ marginTop: "5px", marginBottom: "5px", padding: "0rem", height: "2.5rem", width: "2.5rem" }}
                disabled={!this.state.options.isEditable}
              />
              <Button
                onClick={(e) => {
                  this.exportToExcel(e, data)
                }}
                icon={<FiletypeXlsx size={"1.5rem"} />}
                rounded
                className="p-button-success"
                style={{ marginTop: "5px", marginBottom: "5px", padding: "0rem", height: "2.5rem", width: "2.5rem" }}
                disabled={!this.state.options.isEditable}
              />
            </Stack>
          </Collapse>
        </div>

        <HotkeysTarget2
          hotkeys={
            [
              // When scrolling with shift, scroll horizontally instead of vertically.
            ]
          }
        >
          <Table2
            ref={this.ref}
            bodyContextMenuRenderer={this.renderBodyContextMenu}
            numRows={numRows}
            getCellClipboardData={this.getCellData}
            cellRendererDependencies={[this.state.sortedIndexMap, this.state.columnIndexMap]}
            enableFocusedCell={true}
            enableMultipleSelection={true}
            enableRowReordering={true}
            onRowsReordered={this.handleRowsReordered}
            onColumnsReordered={this.handleColumnsReordered}
            enableColumnReordering={true}
          >
            {columns}
          </Table2>
        </HotkeysTarget2>
      </div>
    )
  }

  private handleColumnsReordered = (oldIndex: number, newIndex: number, length: number) => {
    if (oldIndex === newIndex) {
      return
    }
    const nextChildren = Utils.reorderArray(this.state.columns, oldIndex, newIndex, length)
    const nextColumnIndexMap = Utils.reorderArray(this.state.columnIndexMap, oldIndex, newIndex, length)
    this.setState({ columns: nextChildren, columnIndexMap: nextColumnIndexMap })
  }

  private handleRowsReordered = (oldIndex: number, newIndex: number, length: number) => {
    if (oldIndex === newIndex) {
      return
    }
    let newSortedIndexMap = Utils.times(this.state.data.length, (i: number) => i)
    if (this.state.sortedIndexMap.length === 0) {
      this.setState({ sortedIndexMap: Utils.reorderArray(newSortedIndexMap, oldIndex, newIndex, length) })
    } else {
      this.setState({ sortedIndexMap: Utils.reorderArray(this.state.sortedIndexMap, oldIndex, newIndex, length) })
    }
  }

  private getCellData = (rowIndex: number, columnIndex: number) => {
    const sortedRowIndex = this.state.sortedIndexMap[rowIndex]
    if (sortedRowIndex != null) {
      rowIndex = sortedRowIndex
    }
    if (this.state.sparseCellData[`${rowIndex}-${this.state.columnsNames[columnIndex]}`]) {
      return this.state.sparseCellData[`${rowIndex}-${this.state.columnsNames[columnIndex]}`]
    }
    return this.state.data[rowIndex][this.state.columnsNames[this.state.columnIndexMap[columnIndex]]]
  }

  private getIntent = (rowIndex: number, columnIndex: number) => {}

  private getCellRenderer = (rowIndex: number, columnIndex: number) => {
    return (
      <EditableCell2
        value={this.getCellData(rowIndex, columnIndex)}
        onCancel={this.cellValidator(rowIndex, columnIndex)}
        onChange={this.cellValidator(rowIndex, columnIndex)}
        onConfirm={this.cellSetter(rowIndex, columnIndex)}
      ></EditableCell2>
    )
  }

  private dataKey = (rowIndex: number, columnIndex: number) => {
    const sortedRowIndex = this.state.sortedIndexMap[rowIndex]
    if (sortedRowIndex != null) {
      rowIndex = sortedRowIndex
    }
    return `${rowIndex}-${this.state.columnsNames[columnIndex]}`
  }

  private cellValidator = (rowIndex: number, columnIndex: number) => {
    const dataKey = this.dataKey(rowIndex, columnIndex)
    return (value: string) => {
      const intent = this.isValidValue(value) ? null : Intent.DANGER
      this.setSparseState("sparseCellIntent", dataKey, intent)
      this.setSparseState("sparseCellData", dataKey, value)
    }
  }

  private cellSetter = (rowIndex: number, columnIndex: number) => {
    const dataKey = this.dataKey(rowIndex, columnIndex)
    return (value: string) => {
      //   const intent = this.isValidValue(value) ? null : Intent.DANGER
      this.setSparseState("sparseCellData", dataKey, value)
      //   this.setSparseState("sparseCellIntent", dataKey, intent)
    }
  }

  private renderBodyContextMenu = (context: MenuContext) => {
    return (
      <Menu>
        <CopyCellsMenuItem context={context} getCellData={this.getCellData} text="Copy" />
      </Menu>
    )
  }

  private sortColumn = (columnIndex: number, comparator: (a: any, b: any) => number) => {
    const { data, columnsNames } = this.state
    const sortedIndexMap = Utils.times(data.length, (i: number) => i)
    sortedIndexMap.sort((a: number, b: number) => {
      return comparator(data[a][columnsNames[columnIndex]], data[b][columnsNames[columnIndex]])
    })
    this.setState({ sortedIndexMap })
    // console.log("sortColumn", this.state)
  }

  private isValidValue(value: string) {
    return /^[a-zA-Z]*$/.test(value)
  }

  private setSparseState<T>(stateKey: string, dataKey: string, value: T) {
    const stateData = (this.state as any)[stateKey] as { [key: string]: T }
    const values = { ...stateData, [dataKey]: value }
    this.setState({ [stateKey]: values })
  }
}

export default DataTableWrapperBPClass
