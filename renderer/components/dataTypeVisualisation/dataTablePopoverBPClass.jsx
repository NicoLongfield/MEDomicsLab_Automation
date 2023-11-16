import React, { useContext, useEffect, useState } from "react"
import { Button, Popover, Menu, MenuItem, InputGroup } from "@blueprintjs/core"
import { Select } from "@blueprintjs/select"
import { Tag } from "react-bootstrap-icons"
import { Stack } from "react-bootstrap"
import { DataContext } from "../workspace/dataContext"
import { Utils as danfoUtils } from "danfojs-node"
import { deepCopy } from "../../utilities/staticFunctions"
import { Chip } from "primereact/chip"
import { generateRandomColor } from "../input/taggingUtils"

const dfUtils = new danfoUtils()

/**
 * Component that renders the popover for the data type selection in the data table and also the filter input
 * Present in the data table header
 * @param {Object} props
 * @param {Object} props.config - The config object of the data table
 * @param {String} props.columnName - The name of the column
 * @param {Array} props.category - The category of the column
 * @param {Function} props.filterColumn - The function to filter the column
 * @param {Function} props.filterValue - The filter value
 * @returns {JSX.Element}
 */
const DataTablePopoverBP = (props) => {
  const selectedIcon = {
    // The icon to be displayed in the popover button
    Numerical: "array-floating-point",
    Categorical: "array-numeric",
    Time: "array-timestamp",
    String: "array-string"
  }

  const getTypeFromInferedDtype = (dtype) => {
    // To get the data type from the infered data type
    switch (dtype) {
      case "float32":
        return "Numerical"
      case "int32":
        return "Categorical"
      case "datetime64[ns]":
        return "Time"
      case "string":
        return "String"
      default:
        return "Numerical"
    }
  }

  const { globalData, setGlobalData } = useContext(DataContext) // The global data object
  const [selectedType, setSelectedType] = useState(getTypeInGlobalData()) // The selected data type
  const [tags, setTags] = useState([]) // The tags for the string data type
  const menuItemOptions = { shouldDismissPopover: false, onClick: (e) => handleDataTypeChange(e), roleStructure: "listoption" } // The options for the menu items
  /**
   * To handle the change in the data type
   * @param {Object} e - The event object
   * @returns {Void}
   */
  const handleDataTypeChange = (e) => {
    console.log("Data type changed", e.target.innerText)
    setSelectedType(e.target.innerText)
    changeTypeInGlobalData(e.target.innerText)
  }

  /**
   * To change the data type of the column in the global data object
   * @param {String} type
   * @returns {Void}
   */
  const changeTypeInGlobalData = (type) => {
    let globalDataCopy = { ...globalData }
    if (globalDataCopy[props.config.uuid]) {
      if (globalDataCopy[props.config.uuid].metadata.columnsInfo) {
        if (globalDataCopy[props.config.uuid].metadata.columnsInfo[props.columnName]) {
          globalDataCopy[props.config.uuid].metadata.columnsInfo[props.columnName].dataType = type
        } else {
          globalDataCopy[props.config.uuid].metadata.columnsInfo[props.columnName] = {
            dataType: type
          }
        }
      } else {
        globalDataCopy[props.config.uuid].metadata.columnsInfo = {
          [props.columnName]: {
            dataType: type
          }
        }
      }
      setGlobalData(globalDataCopy)
    }
  }

  /**
   * To get the data type of the column from the global data object
   * @returns {String} - The data type of the column
   */
  function getTypeInGlobalData() {
    let medObject = globalData[props.config.uuid]
    if (medObject) {
      if (medObject.metadata.columnsInfo) {
        if (medObject.metadata.columnsInfo[props.columnName]) {
          return medObject.metadata.columnsInfo[props.columnName].dataType
        }
      }
    }
    return "Numerical"
  }

  /**
   * To get the unique values in the column
   * @returns {Array} - The array of unique values
   */
  function getUniqueValues() {
    let medObject = globalData[props.config.uuid]
    if (medObject) {
      let df = medObject.data
      let colName = props.columnName
      let colData = df.$getColumnData(colName).$data
      let uniqueValues = dfUtils.unique(colData)
      // If unique values contain "", then write it as "[Empty]"
      if (uniqueValues.includes("")) {
        uniqueValues[uniqueValues.indexOf("")] = "[Empty]"
      }

      return uniqueValues
    }
    return []
  }

  /**
   * To set the selected type to the type of the column if it is already present in the global data object
   * @returns {Void}
   */
  useEffect(() => {
    let medObject = globalData[props.config.uuid]
    let globalDataCopy = { ...globalData }
    if (medObject) {
      if (medObject.metadata.columnsInfo) {
        if (medObject.metadata.columnsInfo[props.columnName]) {
          if (medObject.metadata.columnsInfo[props.columnName].dataType) {
            let type = medObject.metadata.columnsInfo[props.columnName].dataType
            if (Object.keys(selectedIcon).includes(type)) {
              setSelectedType(medObject.metadata.columnsInfo[props.columnName].dataType)
            } else {
              globalDataCopy[props.config.uuid].metadata.columnsInfo[props.columnName].dataType = getTypeFromInferedDtype(props.category[0])
              setSelectedType(getTypeFromInferedDtype(props.category[0]))
              setGlobalData(globalDataCopy)
            }
          }
        }
      } else {
        globalDataCopy[props.config.uuid].metadata.columnsInfo = {
          [props.columnName]: {
            dataType: getTypeFromInferedDtype(props.category[0])
          }
        }
        setGlobalData(globalDataCopy)
      }
    } else {
      // NO OP
    }
  }, [])

  useEffect(() => {
    setSelectedType(getTypeInGlobalData())
    let globalDataCopy = { ...globalData }
    let tags = globalDataCopy[props.config.uuid].getColumnsTag()
    console.log("tags", tags, globalDataCopy[props.config.uuid])
    let tagsDict = tags.tagsDict
    let columnsTag = tags.columnsTag
    console.log("columnsTag", columnsTag[props.columnName])
    let columnTag = columnsTag[props.columnName]
    let columnTagToSet = {}

    if (columnTag) {
      columnTag.forEach((tag) => {
        if (tagsDict) {
          if (tagsDict[tag]) {
            columnTagToSet[tag] = tagsDict[tag]
          } else {
            columnTagToSet[tag] = { color: generateRandomColor(tag), fontColor: "white" }
          }
        } else {
          columnTagToSet[tag] = { color: generateRandomColor(tag), fontColor: "white" }
        }
      })
    }
    setTags(columnTagToSet)
  }, [props])

  useEffect(() => {
    console.log("tags changed", tags)
  }, [tags])

  return (
    <>
      <Stack direction="vertical" gap={1} style={{ cursor: "default" }}>
        <Stack className="datatable-tags" direction="horizontal" gap={0} style={{ overflowX: "auto", padding: "0rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {tags &&
            Object.keys(tags).map((tag, index) => {
              let color = tags[tag].color
              let fontColor = tags[tag].fontColor
              let style = { backgroundColor: color, color: fontColor, cursor: "default" }
              return <Chip className="custom-token custom-bp-table" key={"chip" + index} label={tag} style={style} />
            })}
        </Stack>
        <Stack direction="horizontal" gap={1} style={{ marginInline: "5px", paddingBottom: "3px" }}>
          <Popover
            content={
              <Menu>
                <MenuItem icon="array-floating-point" text="Numerical" {...menuItemOptions} selected={selectedType == "Numerical"} />
                <MenuItem icon="array-numeric" text="Categorical" {...menuItemOptions} selected={selectedType == "Categorical"} />
                <MenuItem icon="array-timestamp" text="Time" {...menuItemOptions} selected={selectedType == "Time"} />
                <MenuItem icon="array-string" text="String" {...menuItemOptions} selected={selectedType == "String"} />
              </Menu>
            }
            placement="bottom-end"
          >
            <Button active={false} icon={selectedIcon[selectedType]} style={{ padding: "0.25rem", boxSizing: "content-box", minWidth: "1rem", minHeight: "1rem" }} />
          </Popover>
          {selectedType == "Categorical" && ( // If the data type is categorical, then show the select component
            <>
              <Select
                items={getUniqueValues()}
                itemRenderer={(item, { handleClick, modifiers }) => {
                  return <MenuItem selected={item === props.filterValue(props.index).filterValue} active={modifiers.active} disabled={modifiers.disabled} key={item} onClick={handleClick} text={item} roleStructure="listoption" />
                }}
                onItemSelect={(item, dict) => {
                  console.log("Item selected", item, props.index, dict)
                  if (props.filterValue(props.index).filterValue !== undefined && props.filterValue(props.index).filterValue !== null) {
                    if (props.filterValue(props.index).filterValue == item) {
                      props.filterColumn(props.index, "")
                    } else {
                      props.filterColumn(props.index, item)
                    }
                  } else {
                    props.filterColumn(props.index, item)
                  }
                }}
                popoverProps={{
                  usePortal: true
                }}
                inputProps={{ value: props.filterValue(props.index).filterValue }}
                popoverContentProps={{
                  style: { maxHeight: "200px", width: "100%", height: "200px", overflow: "auto" }
                }}
                filterable={false}
              >
                <Button rightIcon="caret-down" placeholder="Select value" text={props.filterValue(props.index).filterValue !== "" && props.filterValue(props.index).filterValue ? props.filterValue(props.index).filterValue : "Select value"} style={{ width: "auto", height: "1.5rem" }} small={true} />
              </Select>
            </>
          )}{" "}
          {selectedType == "Numerical" && ( // If the data type is numerical, then show this input component
            <>
              <InputGroup
                asyncControl={true}
                disabled={false}
                large={false}
                placeholder={props.columnName + " " + props.index}
                readOnly={false}
                small={true}
                style={{ width: "100%" }}
                value={props.filterValue(props.index).filterValue || ""}
                onValueChange={(value) => {
                  props.filterColumn(props.index, value)
                }}
              />
            </>
          )}
          {selectedType == "String" && ( // If the data type is string, then show this input component
            <>
              <InputGroup
                asyncControl={true}
                disabled={false}
                large={false}
                placeholder={props.columnName + " " + props.index}
                readOnly={false}
                small={true}
                style={{ width: "100%" }}
                rightElement={<Tag style={{ marginInline: "5px" }} />}
                value={props.filterValue(props.index).filterValue || ""}
                onChange={(e) => {
                  props.filterColumn(props.index, e.target.value)
                }}
              />
            </>
          )}
          {selectedType == "Time" && ( // If the data type is time, then show this input component
            <>
              <InputGroup
                asyncControl={true}
                disabled={false}
                large={false}
                placeholder={props.columnName + " " + props.index}
                readOnly={false}
                small={true}
                style={{ width: "100%" }}
                value={deepCopy(props.filterValue(props.index).filterValue) || ""}
                onValueChange={(value) => {
                  props.filterColumn(props.index, value)
                }}
              />
            </>
          )}
        </Stack>
      </Stack>
    </>
  )
}

export { DataTablePopoverBP }
