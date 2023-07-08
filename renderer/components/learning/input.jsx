import React, { useState, useEffect } from "react";
import CreatableSelect from "react-select/creatable"; // https://react-select.com/creatable
import Select from "react-select";
import FloatingLabel from "react-bootstrap/FloatingLabel";
import Form from "react-bootstrap/Form";
import { toast } from "react-toastify"; // https://www.npmjs.com/package/react-toastify

/**
 * 
 * @param {*} label new option label 
 * @returns {object} a new option
 * 
 * @description
 * This function is used to create a new option for the select
 */
const createOption = (label) => ({
	label,
	value: label,
});

/**
 * 
 * @param {string} name name of the setting
 * @param {object} settingInfos infos of the setting
 * @param {object} data data of the node 
 * @returns {JSX.Element} A Input component
 * 
 * @description
 * This component is used to display a Input component.
 * it handles multiple types of input and format them to be similar
 */
const Input = ({ name, settingInfos, currentValue , onInputChange}) => {
	const [inputUpdate, setInputUpdate] = useState({})
	const [inputValue, setInputValue] = useState("");

	/**
     * 
     * @param {Event} event keydown event 
     * 
     * @description
     * This function is used to handle the keydown event on the input
     * it handles the creation of a new option 
     * this function is used only for the select input
     */
	const handleKeyDown = (event) => {
		if (!inputValue) return;
		switch (event.key) {
		case "Enter":
		case "Tab":
			(currentValue == undefined) && (currentValue = [])
			setInputUpdate({ name: name, value: [...currentValue, createOption(inputValue)], type: settingInfos.type })
			setInputValue("");
			event.preventDefault();
		}
	};

	// execute this when an input is updated
	// it also verify if the input is correct
	useEffect(() => {
		if (inputUpdate.name != undefined) {
			if (inputUpdate.type == "int") {
				let regexPattern = /^-?[0-9]+$/;
				if (!regexPattern.test(inputUpdate.value)) {
					toast.warn("This input must be an integer", {
						position: "bottom-right",
						autoClose: 2000,
						hideProgressBar: false,
						closeOnClick: true,
						pauseOnHover: true,
						draggable: true,
						progress: undefined,
						theme: "light",
						toastId: "customId"
					});
				}
			}
			console.log("inputUpdate", inputUpdate)
			onInputChange(inputUpdate)
		}
	}, [inputUpdate])

	/**
     * 
     * @param {Object} settingInfos contains infos about the setting
     * @returns {JSX.Element} a correct input component according to the type of the setting
     * 
     * @description
     * This function is used to return a correct input component according to the type of the setting
     * it handles multiple types of input and format them to be similar
     * 
     */
	const getCorrectInputType = (settingInfos) => {
		switch (settingInfos.type) {
		// for normal string input
		case "string":
			return (
				<FloatingLabel
					controlId={name}
					label={name}
					className="margin-bottom-15 input-hov"
				>
					<Form.Control type="text" defaultValue={currentValue} onChange={e => setInputUpdate({ name: name, value: e.target.value, type: settingInfos.type })} />
				</FloatingLabel >
			)
		// for integer input
		case "int":
			return (
				<FloatingLabel
					controlId={name}
					label={name}
					className="margin-bottom-15 input-hov"
				>
					<Form.Control type="number" defaultValue={currentValue} onChange={e => setInputUpdate({ name: name, value: e.target.value, type: settingInfos.type })} />
				</FloatingLabel >
			)
		// for float input
		case "float":
			return (
				<FloatingLabel
					controlId={name}
					label={name}
					className="margin-bottom-15 input-hov"
				>
					<Form.Control type="number" defaultValue={currentValue} onChange={e => setInputUpdate({ name: name, value: e.target.value, type: settingInfos.type })} />
				</FloatingLabel >
			)
		// for boolean input (form select of 2 options True/False)
		case "bool":
			return (
				<FloatingLabel
					controlId={name}
					label={name}
					className="margin-bottom-15 input-hov"
				>
					<Form.Select defaultValue={currentValue} onChange={e => setInputUpdate({ name: name, value: e.target.value, type: settingInfos.type })}>
						<option value="True">True</option>
						<option value="False">False</option>
					</Form.Select>
				</FloatingLabel >

			)
		// for list input (form select of all the options)
		case "list":
			return (
				<>
					<FloatingLabel
						controlId={name}
						label={name}
						className="margin-bottom-15 input-hov"
					>
						<Form.Select className="" defaultValue={currentValue} onChange={e => setInputUpdate({ name: name, value: e.target.value, type: settingInfos.type })}>
							{Object.entries(settingInfos.choices).map(([option, tooltip]) => {
								return (<option key={option} value={option}>{option}</option>);
							})}
						</Form.Select>
					</FloatingLabel>
				</>
			)
		// for list input (form select of all the options, multiple selection possible)
		case "list-multiple":
			return (
				<>
					<label className="custom-lbl">{name}</label>
					<Select
						options={

							Object.entries(settingInfos.choices).map(([option, tooltip]) => {
								(currentValue == undefined) && (currentValue = [])
								console.log("option", option)
								console.log("currentValue", currentValue)
								if (!currentValue.includes(option))
									return (createOption(option));
							})
						}

						value={currentValue}
						onChange={(newValue) => setInputUpdate({ name: name, value: newValue, type: settingInfos.type })}
						isMulti
						isClearable
						isSearchable
						isCreatable={false}
					/>
				</>
			)
		// for range input
		case "range":
			return (
				<FloatingLabel
					controlId={name}
					label={name}
					className="margin-bottom-15 input-hov"
				>
					<Form.Control type="range" defaultValue={currentValue} onChange={e => setInputUpdate({ name: name, value: e.target.value, type: settingInfos.type })} />
				</FloatingLabel >
			)
		// for custom list input (multiple custom string inputs)
		case "custom-list":
			return (
				<>
					<label className="custom-lbl">{name}</label>
					<CreatableSelect
						components={
							{ DropdownIndicator: null }
						}
						inputValue={inputValue}
						isClearable
						isMulti
						menuIsOpen={false}
						onChange={(newValue) => setInputUpdate({ name: name, value: newValue, type: settingInfos.type })}
						onInputChange={(newValue) => setInputValue(newValue)}
						onKeyDown={handleKeyDown}
						placeholder="Add"
						value={currentValue}
						className="margin-bottom-15 input-hov"
					/>

				</>
			)
		// for pandas dataframe input (basically a string input for now)
		case "pandas.DataFrame":
			return (
				<FloatingLabel
					controlId={name}
					label={name}
					className="margin-bottom-15 input-hov"
				>
					<Form.Control type="text" defaultValue={currentValue} onChange={e => setInputUpdate({ name: name, value: e.target.value, type: settingInfos.type })} />
				</FloatingLabel >
			)
		// for all the other types of input (basically a string input for now)
		default:
			return (
				<FloatingLabel
					controlId={name}
					label={name}
					className="margin-bottom-15 input-hov"
				>
					<Form.Control type="text" defaultValue={currentValue} onChange={e => setInputUpdate({ name: name, value: e.target.value, type: settingInfos.type })} />
				</FloatingLabel >
			)
		}
	}
	return (
		<>
			{getCorrectInputType(settingInfos)}
		</>
	);
}

export default Input;