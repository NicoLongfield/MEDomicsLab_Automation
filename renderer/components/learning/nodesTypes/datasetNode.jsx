import React, { useState, useContext, useEffect } from "react"
import Node from "../../flow/node"
import Input from "../input"
import { Button } from "react-bootstrap"
import ModalSettingsChooser from "../modalSettingsChooser"
import * as Icon from "react-bootstrap-icons"
import { FlowFunctionsContext } from "../../flow/context/flowFunctionsContext"
import { Stack } from "react-bootstrap"
import Form from "react-bootstrap/Form"
import { DataContext } from "../../workspace/dataContext"
import MedDataObject from "../../workspace/medDataObject"
import { LoaderContext } from "../../generalPurpose/loaderContext"

/**
 *
 * @param {string} id id of the node
 * @param {object} data data of the node
 * @returns {JSX.Element} A StandardNode node
 *
 * @description
 * This component is used to display a StandardNode node.
 * it handles the display of the node and the modal
 *
 */
const DatasetNode = ({ id, data }) => {
  const [modalShow, setModalShow] = useState(false) // state of the modal
  const [selection, setSelection] = useState(data.internal.selection || "medomics") // state of the selection (medomics or custom
  const { updateNode } = useContext(FlowFunctionsContext)
  const { globalData, setGlobalData } = useContext(DataContext)
  const { setLoader } = useContext(LoaderContext)

  // update the node internal data when the selection changes
  useEffect(() => {
    data.internal.selection = selection
    data.internal.hasWarning = { state: true, tooltip: <p>Some default feilds are missing</p> }
    updateNode({
      id: id,
      updatedData: data.internal
    })
  }, [selection])

  // update the node internal data when the selection changes
  useEffect(() => {
    if (data.internal.settings.files && data.internal.settings.files.path == "") {
      data.internal.hasWarning = { state: true, tooltip: <p>No file selected</p> }
    } else {
      data.internal.hasWarning = { state: false }
    }
    updateNode({
      id: id,
      updatedData: data.internal
    })
  }, [])

  // update the node when the selection changes
  const onSelectionChange = (e) => {
    setSelection(e.target.value)
    data.internal.settings = {}
    data.internal.checkedOptions = []
    e.stopPropagation()
    e.preventDefault()
    console.log("onselectionchange", e.target.value)
  }

  /**
   *
   * @param {Object} inputUpdate The input update
   *
   * @description
   * This function is used to update the node internal data when an input changes.
   * Custom to this node, it also updates the global data when the files input changes.
   */
  const onInputChange = (inputUpdate) => {
    data.internal.settings[inputUpdate.name] = inputUpdate.value
    if (inputUpdate.name == "files" || inputUpdate.name == "target") {
      setGlobalData({ ...globalData })
    }
    updateNode({
      id: id,
      updatedData: data.internal
    })
  }

  /**
   *
   * @param {Object} hasWarning The warning object
   *
   * @description
   * This function is used to update the node internal data when a warning is triggered from the Input component.
   */
  const handleWarning = (hasWarning) => {
    data.internal.hasWarning = hasWarning
    updateNode({
      id: id,
      updatedData: data.internal
    })
  }

  /**
   *
   * @param {Object} inputUpdate The input update
   *
   * @description
   * This function is used to update the node internal data when the files input changes.
   */
  const onFilesChange = async (inputUpdate) => {
    data.internal.settings[inputUpdate.name] = inputUpdate.value
    if (inputUpdate.value.path != "") {
      setLoader(true)
      let { columnsArray, columnsObject } = await MedDataObject.getColumnsFromPath(inputUpdate.value.path, globalData, setGlobalData)
      let steps = await MedDataObject.getStepsFromPath(inputUpdate.value.path, globalData, setGlobalData)
      setLoader(false)
      steps && (data.internal.settings.steps = steps)
      data.internal.settings.columns = columnsObject
      data.internal.settings.target = columnsArray[columnsArray.length - 1]
    } else {
      delete data.internal.settings.target
      delete data.internal.settings.columns
    }
    updateNode({
      id: id,
      updatedData: data.internal
    })
  }

  /**
   *
   * @param {Object} inputUpdate The input update
   *
   * @description
   * This function is used to update the node internal data when the files input changes.
   */
  const onMultipleFilesChange = async (inputUpdate) => {
    console.log("inputUpdate-multiple", inputUpdate)
    data.internal.settings[inputUpdate.name] = inputUpdate.value
    data.internal.settings.tags = []
    if (inputUpdate.value.length > 0) {
      data.internal.settings.multipleColumns = []
      inputUpdate.value.forEach(async (inputUpdateValue) => {
        if (inputUpdateValue.path != "") {
          setLoader(true)
          let { columnsArray, columnsObject } = await MedDataObject.getColumnsFromPath(inputUpdateValue.path, globalData, setGlobalData)
          let steps = await MedDataObject.getStepsFromPath(inputUpdateValue.path, globalData, setGlobalData)
          setLoader(false)
          let timePrefix = inputUpdateValue.name.split("_")[0]
          steps && (data.internal.settings.steps = steps)
          data.internal.settings.columns = columnsObject
          columnsObject = Object.keys(columnsObject).reduce((acc, key) => {
            acc[timePrefix + "_" + key] = timePrefix + "_" + columnsObject[key]
            return acc
          }, {})
          console.log("columnsObject", columnsObject)
          let lastMultipleColumns = data.internal.settings.multipleColumns ? data.internal.settings.multipleColumns : []
          data.internal.settings.multipleColumns = { ...lastMultipleColumns, ...columnsObject }
          data.internal.settings.target = columnsArray[columnsArray.length - 1]
        }
      })
    } else {
      delete data.internal.settings.target
      delete data.internal.settings.columns
      delete data.internal.settings.tags
      delete data.internal.settings.multipleColumns
    }
    updateNode({
      id: id,
      updatedData: data.internal
    })
  }

  /**
   *
   * @param {Object} inputUpdate The input update
   *
   * @description
   * This function is used to update the node internal data when the tags input changes.
   */
  const onMultipleTagsChange = async (inputUpdate) => {
    console.log("inputUpdate-multiple", inputUpdate)
    data.internal.settings[inputUpdate.name] = inputUpdate.value
    updateNode({
      id: id,
      updatedData: data.internal
    })
  }

  return (
    <>
      {/* build on top of the Node component */}
      <Node
        key={id}
        id={id}
        data={data}
        setupParam={data.setupParam}
        // the body of the node is a form select (particular to this node)
        nodeBody={
          <>
            <Form.Select
              aria-label="machine learning model"
              onChange={onSelectionChange}
              defaultValue={data.internal.selection}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
            >
              <option
                key="medomics"
                value="medomics"
                // selected={optionName === selection}
              >
                MEDomicsLab standard
              </option>
              <option
                key="custom"
                value="custom"
                // selected={optionName === selection}
              >
                Custom data file
              </option>
            </Form.Select>
          </>
        }
        // default settings are the default settings of the node, so mandatory settings
        defaultSettings={
          <>
            <Stack id="default" direction="vertical" gap={1}>
              {(() => {
                switch (data.internal.selection) {
                  case "medomics":
                    return (
                      <>
                        <Input
                          key={"files"}
                          name="files"
                          settingInfos={{
                            type: "data-input-multiple",
                            tooltip: "<p>Specify a data file (xlsx, csv, json)</p>"
                          }}
                          currentValue={data.internal.settings.files || null}
                          onInputChange={onMultipleFilesChange}
                          setHasWarning={handleWarning}
                        />

                        <Input
                          key={"tags"}
                          name="tags"
                          settingInfos={{
                            type: "tags-input-multiple",
                            tooltip: "<p>Specify a data file (xlsx, csv, json)</p>",
                            selectedDatasets: data.internal.settings.files
                          }}
                          currentValue={data.internal.settings.tags || []}
                          onInputChange={onMultipleTagsChange}
                          setHasWarning={handleWarning}
                        />

                        <Input
                          key={"variables"}
                          name="variables"
                          settingInfos={{
                            type: "variables-input-multiple",
                            tooltip: "<p>Specify a data file (xlsx, csv, json)</p>",
                            selectedDatasets: data.internal.settings.files,
                            selectedTags: data.internal.settings.tags
                          }}
                          currentValue={data.internal.settings.variables || []}
                          onInputChange={onMultipleTagsChange}
                          setHasWarning={handleWarning}
                        />

                        <Input
                          disabled={data.internal.settings.files && data.internal.settings.files.path == ""}
                          name="target"
                          currentValue={data.internal.settings.target}
                          settingInfos={{
                            type: "list",
                            tooltip: "<p>Specify the column name of the target variable</p>",
                            choices: data.internal.settings.columns || {}
                          }}
                          onInputChange={onInputChange}
                          customProps={{
                            filter: true
                          }}
                        />
                      </>
                    )
                  case "custom":
                    return (
                      <>
                        <Input
                          name="files"
                          settingInfos={{
                            type: "data-input",
                            tooltip: "<p>Specify a data file (xlsx, csv, json)</p>"
                          }}
                          currentValue={data.internal.settings.files || {}}
                          onInputChange={onFilesChange}
                          setHasWarning={handleWarning}
                        />
                        <Input
                          disabled={data.internal.settings.files && data.internal.settings.files.path == ""}
                          name="target"
                          currentValue={data.internal.settings.target}
                          settingInfos={{
                            type: "list",
                            tooltip: "<p>Specify the column name of the target variable</p>",
                            choices: data.internal.settings.columns || {}
                          }}
                          onInputChange={onInputChange}
                          customProps={{
                            filter: true
                          }}
                        />
                      </>
                    )
                  default:
                    return null
                }
              })()}
            </Stack>
          </>
        }
        // node specific is the body of the node, so optional settings
        nodeSpecific={
          <>
            {/* the button to open the modal (the plus sign)*/}
            <Button variant="light" className="width-100 btn-contour" onClick={() => setModalShow(true)}>
              <Icon.Plus width="30px" height="30px" className="img-fluid" />
            </Button>
            {/* the modal component*/}
            <ModalSettingsChooser show={modalShow} onHide={() => setModalShow(false)} options={data.setupParam.possibleSettings.options} data={data} id={id} />
            {/* the inputs for the options */}
            {data.internal.checkedOptions.map((optionName) => {
              return <Input key={optionName} name={optionName} settingInfos={data.setupParam.possibleSettings.options[optionName]} currentValue={data.internal.settings[optionName]} onInputChange={onInputChange} />
            })}
          </>
        }
      />
    </>
  )
}

export default DatasetNode
