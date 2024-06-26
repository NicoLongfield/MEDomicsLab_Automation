import React, { useEffect, useState } from "react"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
import { InputText } from "primereact/inputtext"
import { Button } from "primereact/button"
import { MongoClient, ObjectId } from "mongodb"
import { toast } from "react-toastify"
import { Panel } from "primereact/panel"

// Import tools components
import TransformColumnTools from "./inputToolsDB/transformColumnTools"
import BasicTools from "./inputToolsDB/basicTools"
import MergeTools from "./inputToolsDB/mergeTools"
import SimpleCleaningTools from "./inputToolsDB/simpleCleaningTools"
import SubsetCreationTools from "./inputToolsDB/subsetCreationTools"
import HoldoutSetCreationTool from "./inputToolsDB/holdoutSetCreationTools"
import FeatureReductionTools from "./inputToolsDB/featureReductionTools"

const mongoUrl = "mongodb://127.0.0.1:27017"
import { saveAs } from "file-saver"
import Papa from "papaparse"
import { getCollectionData } from "./utils"

/**
 * DataTableFromDB component
 * @param data - MongoDB data
 * @param tablePropsData - DataTable props
 * @param tablePropsColumn - Column props
 * @param isReadOnly - Read-only mode
 * @returns {Element} - DataTable component
 * @constructor - DataTableFromDB
 */
const DataTableFromDB = ({ data, tablePropsData, tablePropsColumn, isReadOnly }) => {
  const [innerData, setInnerData] = useState([])
  const [columns, setColumns] = useState([])
  const [newColumnName, setNewColumnName] = useState("")
  const [numRows, setNumRows] = useState("")
  const [hoveredButton, setHoveredButton] = useState(null)
  const [selectedColumns, setSelectedColumns] = useState([])
  const [csvData, setCsvData] = useState([])
  const exportOptions = [
    {
      label: "CSV",
      command: () => {
        handleExport("CSV")
      }
    },
    {
      label: "JSON",
      command: () => {
        handleExport("JSON")
      }
    }
  ]

  const buttonStyle = (id) => ({
    borderRadius: "10px",
    backgroundColor: hoveredButton === id ? "#d32f2f" : "#f44336",
    color: "white",
    border: "none",
    padding: "2px",
    opacity: isReadOnly ? 0.5 : 1,
    cursor: isReadOnly ? "not-allowed" : "pointer"
  })

  const dataTableStyle = {
    height: "100%",
    overflow: "auto"
  }

  const panelContainerStyle = {
    height: "350px",
    overflow: "auto"
  }

  // Fetch data from MongoDB on component mount
  useEffect(() => {
    if (data && data.id) {
      console.log("Fetching data with:", data)
      getCollectionData(data.id)
        .then((fetchedData) => {
          console.log("Fetched data:", fetchedData)
          let collData = fetchedData.map((item) => {
            let keys = Object.keys(item)
            let values = Object.values(item)
            let dataObject = {}
            for (let i = 0; i < keys.length; i++) {
              dataObject[keys[i]] = keys[i] === "_id" ? item[keys[i]].toString() : values[i]
            }
            return dataObject
          })
          setInnerData(collData)
        })
        .catch((error) => {
          console.error("Failed to fetch data:", error)
        })
    } else {
      console.warn("Invalid data prop:", data)
    }
  }, [data])

  // Update columns when innerData changes
  useEffect(() => {
    console.log("innerData updated:", innerData)
    if (innerData.length > 0) {
      const keys = Object.keys(innerData[0]).filter((key) => key !== "_id")
      const newColumns = keys.map((key) => ({ field: key, header: key }))
      setColumns(newColumns)
    }
  }, [innerData])

  // Log columns when updated
  useEffect(() => {
    console.log("columns updated:", columns)
  }, [columns])

  useEffect(() => {
    return () => {
      setCsvData([])
    }
  }, [])

  const getColumnsFromData = (data) => {
    if (data.length > 0) {
      return Object.keys(data[0])
        .filter((key) => key !== "_id")
        .map((key) => <Column key={key} field={key} header={key} {...tablePropsColumn} />)
    }
    return null
  }

  // Add a new column to the table
  const handleAddColumn = () => {
    if (newColumnName !== "") {
      const newColumn = { field: newColumnName, header: newColumnName }
      setColumns([...columns, newColumn])
      const newInnerData = innerData.map((row) => ({ ...row, [newColumn.field]: "" }))
      setInnerData(newInnerData)
      setNewColumnName("")
      toast.success("Column " + newColumnName + " added successfully")
    } else {
      toast.warn("New column name cannot be empty")
    }
  }

  // Update data in MongoDB
  const updateDatabaseData = async (dbname, collectionName, id, field, newValue) => {
    const client = new MongoClient(mongoUrl)
    try {
      await client.connect()
      console.log("Connected to the server for update", dbname, collectionName)
      const db = client.db(dbname)
      const collection = db.collection(collectionName)
      console.log(`Updating document with _id: ${id}, setting ${field} to ${newValue}`)
      const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: { [field]: newValue } })
      console.log("Update result:", result)
      if (result.modifiedCount === 0) {
        console.error("No documents were updated")
      }
    } catch (error) {
      console.error("Error updating data:", error)
    } finally {
      await client.close()
    }
  }

  // Delete data from MongoDB
  const deleteDatabaseData = async (dbname, collectionName, id) => {
    const client = new MongoClient(mongoUrl)
    try {
      await client.connect()
      console.log("Connected to the server for deletion", dbname, collectionName)
      const db = client.db(dbname)
      const collection = db.collection(collectionName)
      console.log(`Deleting document with _id: ${id}`)
      const result = await collection.deleteOne({ _id: new ObjectId(id) })
      console.log("Delete result:", result)
      if (result.deletedCount === 0) {
        console.error("No documents were deleted")
      } else {
        setInnerData(innerData.filter((item) => item._id !== id))
      }
    } catch (error) {
      console.error("Error deleting data:", error)
    } finally {
      await client.close()
    }
  }

  // Insert data into MongoDB
  const insertDatabaseData = async (dbname, collectionName, data) => {
    const client = new MongoClient(mongoUrl)
    try {
      await client.connect()
      console.log("Connected to the server for insertion", dbname, collectionName)
      const db = client.db(dbname)
      const collection = db.collection(collectionName)
      console.log(`Inserting document: ${JSON.stringify(data)}`)
      const result = await collection.insertOne(data)
      console.log("Insert result:", result)
      return result.insertedId.toString()
    } catch (error) {
      console.error("Error inserting data:", error)
    } finally {
      await client.close()
    }
  }

  // Handle cell edit completion
  const onCellEditComplete = (e) => {
    let { rowData, newValue, field, originalEvent: event } = e
    rowData[field] = newValue
    if (!rowData._id) {
      console.log("Calling insertDatabaseData with:", {
        dbname: data.path,
        collectionName: data.uuid,
        data: rowData
      })
      insertDatabaseData(data.path, data.uuid, rowData)
        .then((id) => {
          console.log("Database inserted successfully")
          rowData._id = id
          setInnerData([...innerData])
        })
        .catch((error) => {
          console.error("Failed to insert database:", error)
        })
    } else {
      console.log("Calling updateDatabaseData with:", {
        dbname: data.path,
        collectionName: data.uuid,
        id: rowData._id,
        field,
        newValue
      })
      updateDatabaseData(data.path, data.uuid, rowData._id, field, newValue)
        .then(() => {
          console.log("Database updated successfully")
        })
        .catch((error) => {
          console.error("Failed to update database:", error)
        })
    }
  }

  // Handle row deletion
  const onDeleteRow = (rowData) => {
    const { _id } = rowData
    console.log("Deleting row with _id:", _id)
    deleteDatabaseData(data.path, data.uuid, _id)
      .then(() => {
        console.log("Row deleted successfully")
      })
      .catch((error) => {
        console.error("Failed to delete row:", error)
      })
  }

  // Handle column deletion
  const onDeleteColumn = async (field) => {
    setColumns(columns.filter((column) => column.field !== field))
    setInnerData(
      innerData.map((row) => {
        const { [field]: _, ...rest } = row
        return rest
      })
    )

    const client = new MongoClient(mongoUrl)
    try {
      await client.connect()
      console.log("Connected to the server for column deletion", data.path, data.uuid)
      const db = client.db(data.path)
      const collection = db.collection(data.uuid)
      console.log(`Deleting field ${field} from all documents`)
      const result = await collection.updateMany({}, { $unset: { [field]: "" } })
      console.log("Delete column result:", result)
      if (result.modifiedCount === 0) {
        console.error("No documents were updated")
      }
    } catch (error) {
      console.error("Error deleting column:", error)
    } finally {
      await client.close()
    }
  }

  // Text editor for cell editing
  const textEditor = (options) => {
    return <InputText type="text" value={options.value} onChange={(e) => options.editorCallback(e.target.value)} onKeyDown={(e) => e.stopPropagation()} style={{ width: "100%" }} />
  }

  // Add a new row to the table
  const handleAddRow = () => {
    if (!numRows || isNaN(numRows)) {
      toast.warn("Please enter a valid number for # of rows")
      return
    }
    const newRows = Array.from({ length: numRows }, () => {
      const newRow = {}
      columns.forEach((col) => (newRow[col.field] = ""))
      return newRow
    })
    setInnerData([...innerData, ...newRows])
    toast.success(numRows + " rows added successfully")
  }

  // Refresh data from MongoDB
  const refreshData = () => {
    if (data && data.id) {
      getCollectionData(data.id)
        .then((fetchedData) => {
          let collData = fetchedData.map((item) => {
            let keys = Object.keys(item)
            let values = Object.values(item)
            let dataObject = {}
            for (let i = 0; i < keys.length; i++) {
              dataObject[keys[i]] = keys[i] === "_id" ? item[keys[i]].toString() : values[i]
            }
            return dataObject
          })
          setInnerData(collData)
          toast.success("Data refreshed successfully")
        })
        .catch((error) => {
          console.error("Failed to fetch data:", error)
        })
    } else {
      console.warn("Invalid data prop:", data)
    }
  }

  // Export data to CSV or JSON
  function handleExport(format) {
    if (format === "CSV") {
      const headers = columns.map((column) => column.field)
      const csvData = [headers.join(",")]
      csvData.push(
        ...innerData.map((row) => {
          let csvRow = ""
          for (const [key, value] of Object.entries(row)) {
            csvRow += value + ","
          }
          return csvRow.slice(0, -1)
        })
      )
      const csvString = csvData.join("\n")
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8" })
      saveAs(blob, data.uuid + ".csv")
    } else if (format === "JSON") {
      const jsonBlob = new Blob([JSON.stringify(innerData)], { type: "application/json" })
      saveAs(jsonBlob, data.uuid + ".json")
    } else {
      toast.warn("Please select a format to export")
    }
  }

  // Transform data to binary or non-empty
  const transformData = (type) => {
    if (selectedColumns.length === 0) {
      toast.warn("Please select at least one column to transform")
      return
    }
    const newInnerData = innerData.map((row) => {
      let newRow = { ...row }
      selectedColumns.forEach((column) => {
        if (type === "Binary") {
          newRow[column] = newRow[column] ? 1 : 0
        } else if (type === "Non-empty") {
          newRow[column] = newRow[column] ? newRow[column] : 0
        }
      })
      return newRow
    })
    setInnerData(newInnerData)

    // Update the MongoDB database
    newInnerData.forEach(async (row) => {
      for (const column of selectedColumns) {
        await updateDatabaseData(data.path, data.uuid, row._id, column, row[column])
      }
    })
  }

  // Handle file upload
  const handleFileUpload = (event) => {
    Papa.parse(event.target.files[0], {
      complete: function (results) {
        setCsvData(results.data)
        handleCsvData() // Call handleCsvData function after CSV data is set
      }
    })
  }

  // Handle CSV data
  const handleCsvData = () => {
    if (csvData.length > 0) {
      const columnNames = csvData[0]
      const dbColumnNames = columns.map((column) => column.field)
      const nonExistentColumns = columnNames.filter((column) => !dbColumnNames.includes(column))

      if (nonExistentColumns.length > 0) {
        toast.warn("The following columns do not exist in the database: " + nonExistentColumns.join(", "))
        return
      }

      setSelectedColumns(columnNames)
    }
  }

  // Handle exporting selected columns
  const handleExportColumns = () => {
    if (selectedColumns.length > 0) {
      const csvString = selectedColumns.join(",")
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8" })
      saveAs(blob, "selected_columns.csv")
    } else {
      toast.warn("No columns selected for export")
    }
  }

  // Handle deleting selected columns
  const handleDeleteColumns = async () => {
    if (selectedColumns.length > 0) {
      let newColumns = [...columns]
      let newInnerData = [...innerData]
      let newSelectedColumns = [...selectedColumns]
      for (const column of selectedColumns) {
        newColumns = newColumns.filter((col) => col.field !== column)
        newInnerData = newInnerData.map((row) => {
          const { [column]: _, ...rest } = row
          return rest
        })
        await onDeleteColumn(column)
        newSelectedColumns = newSelectedColumns.filter((col) => col !== column)
      }
      setColumns(newColumns)
      setInnerData(newInnerData)
      setSelectedColumns(newSelectedColumns)
      toast.success("Selected columns deleted successfully")
    } else {
      toast.warn("No columns selected for deletion")
    }
  }

  // Render the DataTable component
  return (
    <>
      {innerData.length === 0 ? (
        <p style={{ color: "red", fontSize: "20px", textAlign: "center", margin: "30px" }}>No data found in {data.name}</p>
      ) : (
        <div style={dataTableStyle}>
          <DataTable
            value={innerData}
            editMode={!isReadOnly ? "cell" : undefined}
            size="small"
            scrollable
            height={"100%"}
            width={"100%"}
            paginator
            rows={20}
            rowsPerPageOptions={[20, 40, 80, 100]}
            {...tablePropsData}
            footer={
              !isReadOnly && (
                <div style={panelContainerStyle}>
                  <Panel header="Add, Export and Refresh Tools" toggleable collapsed={true}>
                    <BasicTools
                      numRows={numRows}
                      setNumRows={setNumRows}
                      handleAddRow={handleAddRow}
                      newColumnName={newColumnName}
                      setNewColumnName={setNewColumnName}
                      handleAddColumn={handleAddColumn}
                      exportOptions={exportOptions}
                      refreshData={refreshData}
                    />
                  </Panel>
                  <Panel header="Transform Column Tools" toggleable collapsed={true}>
                    <TransformColumnTools
                      selectedColumns={selectedColumns}
                      setSelectedColumns={setSelectedColumns}
                      columns={columns}
                      transformData={transformData}
                      handleFileUpload={handleFileUpload}
                      handleCsvData={handleCsvData}
                      handleExportColumns={handleExportColumns}
                      handleDeleteColumns={handleDeleteColumns}
                    />
                  </Panel>
                  <Panel header="Merge Tools" toggleable collapsed={true}>
                    <MergeTools />
                  </Panel>
                  <Panel header="Simple Cleaning Tools" toggleable collapsed={true}>
                    <SimpleCleaningTools />
                  </Panel>
                  <Panel header="Holdout Set Creation Tools" toggleable collapsed={true}>
                    <HoldoutSetCreationTool />
                  </Panel>
                  <Panel header="Subset Creation Tools" toggleable collapsed={true}>
                    <SubsetCreationTools />
                  </Panel>
                  <Panel header="Feature Reduction Tools" toggleable collapsed={true}>
                    <FeatureReductionTools />
                  </Panel>
                </div>
              )
            }
          >
            {!isReadOnly && (
              <Column
                field="delete"
                body={(rowData) => (
                  <Button
                    icon="pi pi-trash"
                    style={buttonStyle(rowData._id)}
                    onClick={() => onDeleteRow(rowData)}
                    onMouseEnter={() => setHoveredButton(rowData._id)}
                    onMouseLeave={() => setHoveredButton(null)}
                  />
                )}
              />
            )}
            {columns.length > 0
              ? columns.map((col) => (
                  <Column
                    key={col.field}
                    field={col.field}
                    header={
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        {!isReadOnly && (
                          <Button
                            icon="pi pi-trash"
                            style={buttonStyle(col.field)}
                            onClick={() => onDeleteColumn(col.field)}
                            onMouseEnter={() => setHoveredButton(col.field)}
                            onMouseLeave={() => setHoveredButton(null)}
                          />
                        )}
                        {col.header}
                      </div>
                    }
                    editor={!isReadOnly ? (options) => textEditor(options) : undefined}
                    onCellEditComplete={!isReadOnly ? onCellEditComplete : undefined}
                  />
                ))
              : getColumnsFromData(innerData)}
          </DataTable>
        </div>
      )}
    </>
  )
}

export default DataTableFromDB
