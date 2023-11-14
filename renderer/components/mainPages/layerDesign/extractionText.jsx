import ExtractionTabularData from "../../extractionTabular/extractionTabularData"
import React from "react"
import ModulePage from "../moduleBasics/modulePage"
import { TYPE } from "../../workspace/dataStepsUtils"

const ExtractionTextPage = ({ pageId, configPath = "" }) => {
  return (
    <>
      <ModulePage pageId={pageId} configPath={configPath} shadow>
        <h1 className="center">Extraction - Text Notes</h1>
        <ExtractionTabularData extractionTypeList={["BioBERT"]} serverUrl={"/extraction_text/"} defaultFilename={"text_extracted_features.csv"} execType={TYPE.TS} />
      </ModulePage>
    </>
  )
}

export default ExtractionTextPage
