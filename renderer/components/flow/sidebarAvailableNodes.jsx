import React, { useContext } from "react"
import Card from "react-bootstrap/Card"
import nodesParams from "../../public/setupVariables/allNodesParams"
import { Col, Row } from "react-bootstrap"
import Button from "react-bootstrap/Button"
import * as Icon from "react-bootstrap-icons"
import { Stack } from "react-bootstrap"
import { requestJson } from "../../utilities/requests"
import { ErrorRequestContext } from "./context/errorRequestContext"
import { WorkspaceContext } from "../workspace/workspaceContext"
import { FlowInfosContext } from "./context/flowInfosContext"
import { toast } from "react-toastify"

/**
 *
 * @param {*} event Represents the drag event that is fired when a node is dragged from the sidebar
 * @param {*} node Information about the node that is being dragged
 *
 * @description
 * This function is called when a node is dragged from the sidebar.
 * It sets the data that is being dragged.
 *
 * @returns {void}
 */
const onDragStart = (event, node) => {
  const stringNode = JSON.stringify(node)
  event.dataTransfer.setData("application/reactflow", stringNode)
  event.dataTransfer.effectAllowed = "move"
}

/**
 * @param {string} title The title of the sidebar
 * @param {string} sidebarType Corresponding to a key in nodesParams
 *
 * @returns {JSX.Element} A Card for each node in nodesParams[sidebarType]
 *
 * @description
 * This component is used to display the nodes available in the sidebar.
 *
 */
const SidebarAvailableNodes = ({ title, sidebarType }) => {
  const { setError } = useContext(ErrorRequestContext)
  const { port } = useContext(WorkspaceContext)
  const { flowContent } = useContext(FlowInfosContext)

  const handleCodeGeneration = (jsonResponse) => {
    console.log("handleCodeGeneration", jsonResponse)
  }

  return (
    <>
      <Col className=" padding-0 available-nodes-panel">
        <Card className="text-center">
          <Card.Header>
            <Row>
              <h5>{title}</h5>
            </Row>
          </Card.Header>
          <Card.Body>
            <Stack direction="vertical" gap={2}>
              {Object.keys(nodesParams[sidebarType]).map((nodeName) => {
                // this code is executed for each node in nodesParams[sidebarType] and returns a Card for each node
                // it also attaches the onDragStart function to each Card so that the node can be dragged from the sidebar and dropped in the flow
                // the data that is being dragged is set in the onDragStart function and passed to the onDrop function in the flow
                let node = nodesParams[sidebarType][nodeName]
                return (
                  <div
                    key={nodeName}
                    className="cursor-grab"
                    onDragStart={(event) =>
                      onDragStart(event, {
                        nodeType: `${node.type}`,
                        name: `${node.title}`,
                        image: `${node.img}`
                      })
                    }
                    draggable
                  >
                    <Card key={node.title} className="text-left">
                      <Card.Header className="draggable-side-node">
                        {node.title}
                        <img src={`/icon/${sidebarType}/${node.img}`} alt={node.title} className="icon-nodes" />
                      </Card.Header>
                    </Card>
                  </div>
                )
              })}
            </Stack>
          </Card.Body>
        </Card>
        <Card className=" padding-0 code-generation-panel">
          <Card.Header>
            <h5>Code generation</h5>
          </Card.Header>
          <Card.Body>
            <p>Generate the code for the current workflow.</p>
            <Button
              onClick={() => {
                requestJson(port, "/learning/code_generation", flowContent, (jsonResponse) => {
                  console.log("received results:", jsonResponse)
                  if (!jsonResponse.error) {
                    handleCodeGeneration(jsonResponse)
                  } else {
                    toast.error("Error detected while running the experiment")
                    setError(jsonResponse.error)
                  }
                })
              }}
            >
              <label>Generate</label>
              <Icon.CodeSlash width="30px" height="30px" style={{ marginLeft: "10px" }} />
            </Button>
          </Card.Body>
        </Card>
      </Col>
    </>
  )
}

export default SidebarAvailableNodes
