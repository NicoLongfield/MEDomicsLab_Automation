import React, { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { MongoClient, ObjectId } from "mongodb";
import {toast} from "react-toastify";
const mongoUrl = "mongodb://127.0.0.1:27017";

/**
 * DataTableFromDB component
 * @param data
 * @param tablePropsData
 * @param tablePropsColumn
 * @returns {Element}
 * @constructor
 */
const DataTableFromDB = ({ data, tablePropsData, tablePropsColumn }) => {
  const [innerData, setInnerData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [newColumnName, setNewColumnName] = useState("");
  const [numRows, setNumRows] = useState("");
  const [hoveredButton, setHoveredButton] = useState(null);

  const isReadOnly = false; // true: Read-Only Mode, false: Edit-Mode

  const buttonStyle = (id) => ({
    borderRadius: '10px',
    backgroundColor: hoveredButton === id ? '#d32f2f' : '#f44336',
    color: 'white',
    border: 'none',
    padding: '2px',
    opacity: isReadOnly ? 0.5 : 1,
    cursor: isReadOnly ? 'not-allowed' : 'pointer'
  });

  // Fetch data from MongoDB
  const getCollectionData = (dbname, collectionName) => {
    const client = new MongoClient(mongoUrl);
    return new Promise(async (resolve, reject) => {
      try {
        await client.connect();
        console.log("Connected to the server", dbname, collectionName);
        const db = client.db(dbname);
        const collection = db.collection(collectionName);
        const fetchedData = await collection.find({}).toArray();
        resolve(fetchedData);
      } catch (error) {
        console.error("Error fetching data:", error);
        reject(error);
      } finally {
        await client.close();
      }
    });
  };

  // Fetch data from MongoDB on component mount
  useEffect(() => {
    if (data && data.uuid && data.path) {
      console.log("Fetching data with:", data);
      getCollectionData(data.path, data.uuid)
          .then((fetchedData) => {
            console.log("Fetched data:", fetchedData);
            let collData = fetchedData.map((item) => {
              let keys = Object.keys(item);
              let values = Object.values(item);
              let dataObject = {};
              for (let i = 0; i < keys.length; i++) {
                dataObject[keys[i]] =
                    keys[i] === "_id" ? item[keys[i]].toString() : values[i];
              }
              return dataObject;
            });
            setInnerData(collData);
          })
          .catch((error) => {
            console.error("Failed to fetch data:", error);
          });
    } else {
      console.warn("Invalid data prop:", data);
    }
  }, [data]);

  // Update columns when innerData changes
  useEffect(() => {
    console.log("innerData updated:", innerData);
    if (innerData.length > 0) {
      const keys = Object.keys(innerData[0]).filter((key) => key !== "_id");
      const newColumns = keys.map((key) => ({ field: key, header: key }));
      setColumns(newColumns);
    }
  }, [innerData]);

  // Log columns when updated
  useEffect(() => {
    console.log("columns updated:", columns);
  }, [columns]);

  const getColumnsFromData = (data) => {
    if (data.length > 0) {
      return Object.keys(data[0])
          .filter((key) => key !== "_id")
          .map((key) => (
              <Column
                  key={key}
                  field={key}
                  header={key}
                  {...tablePropsColumn}
              />
          ));
    }
    return null;
  };

  // Add a new column to the table
  const handleAddColumn = () => {
    if (newColumnName !== "") {
      const newColumn = { field: newColumnName, header: newColumnName };
      setColumns([...columns, newColumn]);
      const newInnerData = innerData.map(row => ({ ...row, [newColumn.field]: "" }));
      setInnerData(newInnerData);
      setNewColumnName("");
      toast.success("Column " + newColumnName + " added successfully")
    } else {
      toast.warn("New column name cannot be empty");
    }
  };

  // Update data in MongoDB
  const updateDatabaseData = async (
      dbname,
      collectionName,
      id,
      field,
      newValue
  ) => {
    const client = new MongoClient(mongoUrl);
    try {
      await client.connect();
      console.log("Connected to the server for update", dbname, collectionName);
      const db = client.db(dbname);
      const collection = db.collection(collectionName);
      console.log(
          `Updating document with _id: ${id}, setting ${field} to ${newValue}`
      );
      const result = await collection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { [field]: newValue } }
      );
      console.log("Update result:", result);
      if (result.modifiedCount === 0) {
        console.error("No documents were updated");
      }
    } catch (error) {
      console.error("Error updating data:", error);
    } finally {
      await client.close();
    }
  };

  // Delete data from MongoDB
  const deleteDatabaseData = async (dbname, collectionName, id) => {
    const client = new MongoClient(mongoUrl);
    try {
      await client.connect();
      console.log(
          "Connected to the server for deletion",
          dbname,
          collectionName
      );
      const db = client.db(dbname);
      const collection = db.collection(collectionName);
      console.log(`Deleting document with _id: ${id}`);
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      console.log("Delete result:", result);
      if (result.deletedCount === 0) {
        console.error("No documents were deleted");
      } else {
        setInnerData(innerData.filter((item) => item._id !== id));
      }
    } catch (error) {
      console.error("Error deleting data:", error);
    } finally {
      await client.close();
    }
  };

  // Insert data into MongoDB
  const insertDatabaseData = async (dbname, collectionName, data) => {
    const client = new MongoClient(mongoUrl);
    try {
      await client.connect();
      console.log("Connected to the server for insertion", dbname, collectionName);
      const db = client.db(dbname);
      const collection = db.collection(collectionName);
      console.log(`Inserting document: ${JSON.stringify(data)}`);
      const result = await collection.insertOne(data);
      console.log("Insert result:", result);
      return result.insertedId.toString();
    } catch (error) {
      console.error("Error inserting data:", error);
    } finally {
      await client.close();
    }
  };

  // Handle cell edit completion
  const onCellEditComplete = (e) => {
    let { rowData, newValue, field, originalEvent: event } = e;
    rowData[field] = newValue;
    if (!rowData._id) {
      console.log("Calling insertDatabaseData with:", {
        dbname: data.path,
        collectionName: data.uuid,
        data: rowData,
      });
      insertDatabaseData(data.path, data.uuid, rowData)
          .then((id) => {
            console.log("Database inserted successfully");
            rowData._id = id;
            setInnerData([...innerData]);
          })
          .catch((error) => {
            console.error("Failed to insert database:", error);
          });
    } else {
      console.log("Calling updateDatabaseData with:", {
        dbname: data.path,
        collectionName: data.uuid,
        id: rowData._id,
        field,
        newValue,
      });
      updateDatabaseData(data.path, data.uuid, rowData._id, field, newValue)
          .then(() => {
            console.log("Database updated successfully");
          })
          .catch((error) => {
            console.error("Failed to update database:", error);
          });
    }
  };

  // Handle row deletion
  const onDeleteRow = (rowData) => {
    toast.success("Row " + rowData._id + " deleted successfully")
    const { _id } = rowData;
    console.log("Deleting row with _id:", _id);
    deleteDatabaseData(data.path, data.uuid, _id)
        .then(() => {
          console.log("Row deleted successfully");
        })
        .catch((error) => {
          console.error("Failed to delete row:", error);
        });
  };

  // Handle column deletion
  const onDeleteColumn = async (field) => {
    toast.success("Column " + field + " deleted successfully")
    setColumns(columns.filter((column) => column.field !== field));
    setInnerData(innerData.map((row) => {
      const { [field]: _, ...rest } = row;
      return rest;
    }));

    const client = new MongoClient(mongoUrl);
    try {
      await client.connect();
      console.log("Connected to the server for column deletion", data.path, data.uuid);
      const db = client.db(data.path);
      const collection = db.collection(data.uuid);
      console.log(`Deleting field ${field} from all documents`);
      const result = await collection.updateMany({}, { $unset: { [field]: "" } });
      console.log("Delete column result:", result);
      if (result.modifiedCount === 0) {
        console.error("No documents were updated");
      }
    } catch (error) {
      console.error("Error deleting column:", error);
    } finally {
      await client.close();
    }
  };

  // Text editor for cell editing
  const textEditor = (options) => {
    return (
        <InputText
            type="text"
            value={options.value}
            onChange={(e) => options.editorCallback(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
        />
    );
  };

  // Add a new row to the table
  const handleAddRow = () => {
    if (!numRows || isNaN(numRows)) {
      toast.warn("Please enter a valid number for # of rows");
      return;
    }
    const newRows = Array.from({ length: numRows }, () => {
      const newRow = {};
      columns.forEach((col) => (newRow[col.field] = ""));
      return newRow;
    });
    setInnerData([...innerData, ...newRows]);
    toast.success(numRows + " rows added successfully");
  };

  // Refresh data from MongoDB
  const refreshData = () => {
    if (data && data.uuid && data.path) {
      getCollectionData(data.path, data.uuid)
          .then((fetchedData) => {
            let collData = fetchedData.map((item) => {
              let keys = Object.keys(item);
              let values = Object.values(item);
              let dataObject = {};
              for (let i = 0; i < keys.length; i++) {
                dataObject[keys[i]] =
                    keys[i] === "_id" ? item[keys[i]].toString() : values[i];
              }
              return dataObject;
            });
            setInnerData(collData);
            toast.success("Data refreshed successfully")
          })
          .catch((error) => {
            console.error("Failed to fetch data:", error);
          });
    } else {
      console.warn("Invalid data prop:", data);
    }
  };

  // Render the DataTable component
  return (
      <>
        {innerData.length === 0 ? (
            <p style={{color: 'red', fontSize: '20px', textAlign: 'center', margin: '30px'}}>
              No data found in {data.uuid}
            </p>
        ) : (
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
                  <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '5px'}}>
                    {!isReadOnly && (
                        <div style={{display: 'flex', alignItems: 'center', margin: '5px'}}>
                          <InputText
                              id="numRows"
                              value={numRows}
                              onChange={(e) => setNumRows(e.target.value)}
                              style={{marginRight: '10px', width: '130px'}}
                              placeholder="# of Rows"
                          />
                          <Button
                              label="Add"
                              onClick={handleAddRow}
                              style={{
                                width: '100px',
                                marginRight: '20px',
                              }}
                          />
                        </div>
                    )}
                    {!isReadOnly && (
                        <div style={{display: 'flex', alignItems: 'center', margin: '5px'}}>
                          <InputText
                              id="newColumnName"
                              value={newColumnName}
                              style={{marginRight: '10px', width: '130px'}}
                              onChange={(e) => setNewColumnName(e.target.value)}
                              placeholder="Column Name"
                          />
                          <Button
                              label="Add"
                              onClick={handleAddColumn}
                              style={{
                                width: '100px',
                              }}
                          />
                        </div>
                    )}
                    <div>
                      <Button
                          icon="pi pi-refresh"
                          onClick={() => refreshData()}
                          style={{
                            width: '50px',
                            padding: '5px',
                            marginLeft: '50px',
                            backgroundColor: 'green',
                            borderColor: 'green',
                          }}
                      />
                    </div>
                  </div>
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
                            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
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
        )}
      </>
  );
};

export default DataTableFromDB;


