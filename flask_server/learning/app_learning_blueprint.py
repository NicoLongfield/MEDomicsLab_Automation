import traceback
from learning.MEDml.MEDexperiment import MEDexperiment
from flask import jsonify, request, Blueprint
import sys
import json
from utils.server_utils import get_json_from_request, get_response_from_error
import os
from pathlib import Path

MEDomics = str(Path(os.path.dirname(os.path.abspath(__file__))).parent.parent)
print(SUBMODULE_DIR)
sys.path.append(SUBMODULE_DIR)

# blueprint definition
app_learning = Blueprint('app_learning', __name__, template_folder='templates', static_folder='static')

# global variables
experiment = None
cur_dashboard = None
files_uploaded = []
df = []


@app_learning.route("/run_experiment", methods=["POST"]) 
def run_experiment():
    """
    triggered by the button play in the dashboard, it starts the execution of the pipeline

    Returns: the results of the pipeline execution
    """
    json_config = get_json_from_request(request)
    print("received data from topic: /run_experiment:")
    print(json.dumps(json_config, indent=4, sort_keys=True))

    global experiment
    global df
    try:
        if experiment is None:
            experiment = MEDexperiment(json_config)
        else:
            experiment.update(json_config)
        experiment.start()
        results_pipeline = experiment.get_results()

    except BaseException as e:
        return get_response_from_error(e)

    return results_pipeline


@app_learning.route('/progress', methods=['POST'])
def progress():
    """
    triggered each x millisecond by the dashboard, it returns the progress of the pipeline execution

    Returns: the progress of the pipeline execution

    """
    global experiment
    if experiment is not None:
        return experiment.get_progress()
    else:
        return {'cur_node': '', 'progress': 0}


