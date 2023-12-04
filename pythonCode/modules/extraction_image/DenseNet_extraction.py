import cv2
import dask.dataframe as dd
import json
import os
import pandas as pd
import re
import requests
import skimage
import sys
import torch
import torch.nn.functional as F
import torchxrayvision as xrv

from pathlib import Path

sys.path.append(
    str(Path(os.path.dirname(os.path.abspath(__file__))).parent.parent))
from med_libs.server_utils import go_print
from med_libs.GoExecutionScript import GoExecutionScript, parse_arguments

json_params_dict, id_ = parse_arguments()
go_print("running script.py:" + id_)


class GoExecScriptDenseNetExtraction(GoExecutionScript):
    """
        This class is used to execute a process from Go

        Args:
            json_params: The input json params
            _id: The id of the page that made the request if any
    """

    def __init__(self, json_params: dict, _id: str = None):
        super().__init__(json_params, _id)
        self.results = {"data": "nothing to return"}
        self._progress["type"] = "process"


    def download_model(self, model):
        """
        Function used to download model from model name because TorchXRayVision downloading may cause errors on Windows.
        """
        if model == "densenet121-res224-all":
            url = "https://github.com/mlmed/torchxrayvision/releases/download/v1/nih-pc-chex-mimic_ch-google-openi-kaggle-densenet121-d121-tw-lr001-rot45-tr15-sc15-seed0-best.pt"
        elif model == "densenet121-res224-nih":
            url = "https://github.com/mlmed/torchxrayvision/releases/download/v1/nih-densenet121-d121-tw-lr001-rot45-tr15-sc15-seed0-best.pt"
        elif model == "densenet121-res224-pc":
            url = "https://github.com/mlmed/torchxrayvision/releases/download/v1/pc-densenet121-d121-tw-lr001-rot45-tr15-sc15-seed0-best.pt"
        elif model == "densenet121-res224-chex":
            url = "https://github.com/mlmed/torchxrayvision/releases/download/v1/chex-densenet121-d121-tw-lr001-rot45-tr15-sc15-seed0-best.pt"
        elif model == "densenet121-res224-rsna":
            url = "https://github.com/mlmed/torchxrayvision/releases/download/v1/kaggle-densenet121-d121-tw-lr001-rot45-tr15-sc15-seed0-best.pt"
        elif model == "densenet121-res224-mimic_nb":
            url = "https://github.com/mlmed/torchxrayvision/releases/download/v1/mimic_nb-densenet121-d121-tw-lr001-rot45-tr15-sc15-seed0-best.pt"
        elif model == "densenet121-res224-mimic_ch":
            url = "https://github.com/mlmed/torchxrayvision/releases/download/v1/mimic_ch-densenet121-d121-tw-lr001-rot45-tr15-sc15-seed0-best.pt"
        else: 
            return
        weights_filename = os.path.basename(url)
        weights_storage_folder = os.path.expanduser(os.path.join("~", ".torchxrayvision", "models_data"))
        weights_filename_local = os.path.expanduser(os.path.join(weights_storage_folder, weights_filename))
        with open(weights_filename_local, 'wb') as f:
            response = requests.get(url, stream=True)
            total = response.headers.get('content-length')

            if total is None:
                f.write(response.content)
            else:
                total = int(total)
                for data in response.iter_content(chunk_size=max(int(total / 1000), 1024 * 1024)):
                    f.write(data)


    def get_single_chest_xray_embeddings(self, img_path, model_weights_name):
        """
        Code taken and updated from the HAIM github repository : https://github.com/lrsoenksen/HAIM
        The function take a JPG image path and DenseNet model weghts and return
        two embeddings vectors containing extracted features from image using the model.

        :param img_path: path to the JGP image
        :param model_weights_name: string identifying the model weights

        Returns: densefeature_embeddings, prediction_embeddings : embedding vectors for the image, computed by the model.


        """
        # Inputs:
        #   img -> Image array
        #
        # Outputs:
        #   densefeature_embeddings ->  CXR dense feature embeddings for image
        #   prediction_embeddings ->  CXR embeddings of predictions for image
        
        
        # %% EXAMPLE OF USE
        # densefeature_embeddings, prediction_embeddings = get_single_chest_xray_embeddings(img)
        
        # Extract chest x-ray image embeddings and preddictions
        densefeature_embeddings = []
        prediction_embeddings = []
        
        img = skimage.io.imread(img_path) # If importing from path use this
        img = xrv.datasets.normalize(img, 255)

        # For each image check if they are 2D arrays
        if len(img.shape) > 2:
            img = img[:, :, 0]
        if len(img.shape) < 2:
            print("Error: Dimension lower than 2 for image!")
        
        # Add color channel for prediction
        #Resize using OpenCV
        img = cv2.resize(img, (224, 224), interpolation=cv2.INTER_AREA)
        img = img[None, :, :]

        model = xrv.models.DenseNet(weights=model_weights_name)

        with torch.no_grad():
            img = torch.from_numpy(img).unsqueeze(0)
            
            # Extract dense features
            feats = model.features(img)
            feats = F.relu(feats, inplace=True)
            feats = F.adaptive_avg_pool2d(feats, (1, 1))
            densefeatures = feats.cpu().detach().numpy().reshape(-1)
            densefeature_embeddings = densefeatures

            # Extract predicted probabilities of considered 18 classes:
            # Get by calling "xrv.datasets.default_pathologies" or "dict(zip(xrv.datasets.default_pathologies,preds[0].detach().numpy()))"
            # ['Atelectasis','Consolidation','Infiltration','Pneumothorax','Edema','Emphysema',Fibrosis',
            #  'Effusion','Pneumonia','Pleural_Thickening','Cardiomegaly','Nodule',Mass','Hernia',
            #  'Lung Lesion','Fracture','Lung Opacity','Enlarged Cardiomediastinum']
            preds = model(img).cpu()
            predictions = preds[0].detach().numpy()
            prediction_embeddings = predictions  

        # Return embeddings
        return densefeature_embeddings, prediction_embeddings


    def _custom_process(self, json_config: dict) -> dict:
        """
        Run time series extraction using TSfresh library.

        Returns: self.results : dict containing data relative to extraction.

        """
        go_print(json.dumps(json_config, indent=4))
        # TODO: add your code here
        # Set local variables
        folder_path = json_config["folderPath"]
        depth = json_config["depth"]
        weights = json_config["relativeToExtractionType"]["selectedWeights"]
        features_to_generate = json_config["relativeToExtractionType"]["selectedFeaturesToGenerate"]
        master_table_compatible = json_config["relativeToExtractionType"]["masterTableCompatible"]
        patient_id_level = json_config["relativeToExtractionType"]["patientIdentifierLevel"]
        column_prefix = json_config["relativeToExtractionType"]["columnPrefix"] + '_'
        if master_table_compatible:
            info_dataframe = json_config["relativeToExtractionType"]["selectedDataset"]
            selected_columns = json_config["relativeToExtractionType"]["selectedColumns"]
            filename_col = selected_columns["filename"]
            date_col = selected_columns["date"]
            df_info = dd.read_csv(info_dataframe).compute()
            df_info = df_info[[filename_col, date_col]].rename(columns={filename_col: "filename"})

        data = pd.DataFrame()

        # Count total number of images, in order to update progressbar
        nb_images = 0
        for root, dirs, files in os.walk(folder_path):
            current_depth = root[len(folder_path):].count(os.sep)
            if current_depth == depth:
                for file in files:
                    if file.endswith(".jpg"):
                        nb_images += 1

        self.set_progress(label="Downloading weights", now=20)
        self.download_model(weights)

        self.set_progress(label="Extraction", now=30)
        # Proceed to extraction file by file
        for root, dirs, files in os.walk(folder_path):
            current_depth = root[len(folder_path):].count(os.sep)
            if current_depth == depth:
                for file in files:
                    if file.endswith(".jpg"):
                        data_img = root.split(os.sep)[-depth:]
                        data_img.append(file)
                        features = self.get_single_chest_xray_embeddings(os.path.join(root, file), weights)
                        data_img = pd.concat([pd.DataFrame(data_img), pd.DataFrame(features[0]), pd.DataFrame(features[1])], ignore_index=True)
                        data = pd.concat([data, pd.DataFrame(data_img).transpose()], ignore_index=True)
                        self.set_progress(now = round(self._progress["now"] + 1/nb_images*50, 2))

        data.columns = ["level_" + str(i+1) for i in range(depth)] + ["filename"] + [column_prefix + "densefeatures_" + str(i) for i in range(len(features[0]))] + [column_prefix + "predictions_" + str(i) for i in range(len(features[1]))]

        if "denseFeatures" not in features_to_generate:
            data.drop([column_prefix + "densefeatures_" + str(i) for i in range(len(features[0]))], axis=1, inplace=True)
        elif "predictions" not in features_to_generate:
            data.drop([column_prefix + "predictions_" + str(i) for i in range(len(features[1]))], axis=1, inplace=True)


        self.set_progress(label="Conversion into submaster table", now=80)
        if master_table_compatible:
            # Set the master compatible options
            tmp = df_info.merge(data, on="filename", how='inner')
            data = tmp
            for i in range(1, depth + 1):
                if i != patient_id_level:
                    data.drop(["level_" + str(i)], axis=1, inplace=True)
            data.drop(["filename"], axis=1, inplace=True)
            columns = data.columns
            new_columns = [columns[1]] + [columns[0]] + list(columns[2:])
            data = data.reindex(columns=new_columns)
            if json_config["relativeToExtractionType"]["parsePatientIdAsInt"]:
                parsed_col = data[data.columns[0]].apply(lambda x: int(re.findall(r'\d+', x)[0]))
                data[data.columns[0]] = parsed_col

        # Save extracted features
        self.set_progress(label="Save extracted features", now=90)
        extracted_folder_path = os.path.join(str(Path(json_config["dataFolderPath"])), "extracted_features")
        if not os.path.exists(extracted_folder_path):
            os.makedirs(extracted_folder_path)
        csv_result_path = os.path.join(extracted_folder_path, json_config['filename'])
        data.to_csv(csv_result_path, index=False)
        json_config["csv_result_path"] = csv_result_path
        self.results = json_config

        return self.results


script = GoExecScriptDenseNetExtraction(json_params_dict, id_)
script.start()