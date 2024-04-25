import React from "react"
import ModulePage from "./moduleBasics/modulePage"
import MED3paHelloWorldPanel from "../med3pa/med3paHelloWorldPanel"

const MED3paPage = ({ pageId, configPath = "" }) => {
  return (
    <>
      <ModulePage pageId={pageId} configPath={configPath} shadow={true}>
        <h1 className="center">MED3pa Module</h1>
        <MED3paHelloWorldPanel />
      </ModulePage>
    </>
  )
}

export default MED3paPage
