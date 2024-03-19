import os
import json
from pycaret.classification.oop import ClassificationExperiment
from pycaret.regression.oop import RegressionExperiment
import sys
from pathlib import Path
sys.path.append(
    str(Path(os.path.dirname(os.path.abspath(__file__))).parent.parent))
from med_libs.server_utils import go_print, load_csv, get_model_from_path, load_med_standard_data
from med_libs.GoExecutionScript import GoExecutionScript, parse_arguments

json_params_dict, id_ = parse_arguments()
go_print("running predict_test.py:" + id_)


class GoExecScriptPredictTest(GoExecutionScript):
    """
        This class is used to execute a process from Go

        Args:
            json_params: The json params of the execution
            _id: The id of the execution
    """

    def __init__(self, json_params: dict, _id: str = None):
        super().__init__(json_params, _id)
        self.results = {"data": "nothing to return"}
        self._progress["type"] = "process"

    def _custom_process(self, json_config: dict) -> dict:
        """
        This function is the main script of the execution of the process from Go
        """
        # go_print(json.dumps(json_config, indent=4))
        model_infos = json_config['model']
        ml_type = model_infos['metadata']['ml_type']
        dataset_infos = json_config['dataset']
        self.set_progress(label="Loading the model", now=10)
        pickle_path = json_config['modelObjPath']
        model = get_model_from_path(pickle_path)
        os.remove(pickle_path)
        go_print(f"model loaded: {model}")

        
        columns_to_keep = None
        # if model.__class__.__name__ != 'LGBMClassifier':
            # Get the feature names from the model
        if dir(model).__contains__('feature_names_in_'):
            columns_to_keep = model.__getattribute__('feature_names_in_').tolist()
        
        if dir(model).__contains__('feature_name_') and columns_to_keep is None:
            columns_to_keep = model.__getattribute__('feature_name_')
        
                

        go_print(f"MODEL NAME: {model.__class__.__name__}")
        
        self.set_progress(label="Loading the dataset", now=20)
        use_med_standard = json_config['useMedStandard']
        if use_med_standard:
            dataset = load_med_standard_data(dataset_infos['selectedDatasets'], model_infos['metadata']['selectedTags'], model_infos['metadata']['selectedVariables'], model_infos['metadata']['target'])
        else:
            dataset = load_csv(dataset_infos['path'], model_infos['metadata']['target'])

        if columns_to_keep is not None:
            # Add the target to the columns to keep if it's not already there
            if model_infos['metadata']['target'] not in columns_to_keep:
                columns_to_keep.append(model_infos['metadata']['target'])
            dataset = dataset[columns_to_keep]

        # calculate the predictions
        self.set_progress(label="Setting up the experiment", now=30)
        exp = None
        if ml_type == 'regression':
            exp = RegressionExperiment()
        elif ml_type == 'classification':
            exp = ClassificationExperiment()
        self.set_progress(label="Setting up the experiment", now=50)
        exp.setup(data=dataset, target=model_infos['metadata']['target'])
        self.set_progress(label="Predicting...", now=70)
        pred_unseen = exp.predict_model(model, data=dataset)
        self.results = {"data": pred_unseen.to_dict(orient='records')}
        self.set_progress(label="Compiling results ...", now=80)
        return self.results


predictTest = GoExecScriptPredictTest(json_params_dict, id_)
predictTest.start()
