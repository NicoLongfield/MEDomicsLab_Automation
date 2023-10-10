import { Dropdown } from "primereact/dropdown"
import React, { useEffect, useState } from "react"

/**
 *
 * @param {Djanfojs Dataframe} dataframe data to extract
 * @param {Function} setExtractionJsonData function setting data to send to the extraction_ts server
 * @param {Function} setMayProceed function setting the boolean variable mayProceed, telling if the process can be executed
 * @returns {JSX.Element} sub-component of the ExtractionTabularData component
 *
 * @description
 * This component is displayed in the ExtractionTabularData component when the user choose "BioBERT"
 * extraction type. It is used to prepare text notes extraction using BioBERT pre-trained model.
 *
 */
const ExtractionBioBERT = ({ dataframe, setExtractionJsonData, setMayProceed }) => {
  const [selectedColumns, setSelectedColumns] = useState({
    patientIdentifier: "",
    notesWeight: "",
    notes: ""
  })

  /**
   *
   * @param {string} column
   * @param {event} event
   *
   * @description
   * Function used to attribute column values from selectors
   *
   */
  const handleColumnSelect = (column, event) => {
    const { value } = event.target
    setSelectedColumns({
      ...selectedColumns,
      [column]: value
    })
  }

  /**
   *
   * @description
   * This function checks if all the necessary attributes from
   * selected columns have a value and update allColumnsSelected.
   *
   */
  useEffect(() => {
    const isAllSelected = Object.values(selectedColumns).every((value) => value !== "")
    setMayProceed(isAllSelected)
    setExtractionJsonData({ selectedColumns: selectedColumns })
  }, [selectedColumns])

  return (
    <>
      <div>
        {/* Dropdowns for column selection */}
        <b>Select columns corresponding to :</b>
        <hr></hr>
        <div className="margin-top-15">
          Patient Identifier : &nbsp;
          {dataframe && dataframe.$data ? <Dropdown value={selectedColumns.patientIdentifier} onChange={(event) => handleColumnSelect("patientIdentifier", event)} options={dataframe.$columns.filter((column, index) => dataframe.$dtypes[index] == "int32" || dataframe.$dtypes[index] == "string")} placeholder="Patient Identifier" /> : <Dropdown placeholder="Patient Identifier" disabled />}
        </div>
        <div>
          Notes Weight : &nbsp;
          {dataframe.$data ? <Dropdown value={selectedColumns.notesWeight} onChange={(event) => handleColumnSelect("notesWeight", event)} options={dataframe.$columns.filter((column, index) => dataframe.$dtypes[index] == "int32" || dataframe.$dtypes[index] == "float32" || (dataframe.$dtypes[index] == "string" && dataframe[column].dt.$dateObjectArray[0] != "Invalid Date"))} placeholder="Notes Weight" /> : <Dropdown placeholder="Notes Weight" disabled />}
        </div>
        <div>
          Measurement value : &nbsp;
          {dataframe.$data ? <Dropdown value={selectedColumns.notes} onChange={(event) => handleColumnSelect("notes", event)} options={dataframe.$columns.filter((column, index) => dataframe.$dtypes[index] == "string" && dataframe[column].dt.$dateObjectArray[0] == "Invalid Date")} placeholder="Notes" /> : <Dropdown placeholder="Notes" disabled />}
        </div>
      </div>
    </>
  )
}

export default ExtractionBioBERT
