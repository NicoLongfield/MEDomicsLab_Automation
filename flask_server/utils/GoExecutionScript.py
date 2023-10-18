import json
import os
import sys
import traceback
from abc import ABC, abstractmethod


def get_response_from_error(e=None, toast=None):
    """
    Gets the response from an error
    """
    if e is not None:
        print(e)
        ex_type, ex_value, ex_traceback = sys.exc_info()
        trace_back = traceback.extract_tb(ex_traceback)
        stack_trace = ''
        for trace in trace_back:
            stack_trace += \
                "\nFile -> %s \nLine -> %d\nFunc.Name -> %s\nMessage -> %s\n" % (trace[0], trace[1], trace[2], trace[3])

        print("Exception type : %s " % ex_type.__name__)
        print("Exception message : %s" % ex_value)
        print("Stack trace : %s" % stack_trace)
        return {"error": {"message": str(e), "stack_trace": str(stack_trace), "value": str(ex_value)}}
    elif toast is not None:
        return {"error": {"toast": toast}}


def send_response(response: dict):
    """
    Sends the response to the client
    """
    to_send = json.dumps(response)
    file_path = os.path.join(os.getcwd(), "temp_requests.txt")
    f = open(file_path, "w")
    f.write(to_send)
    f.close()
    sys.stdout.flush()
    print("response-ready")
    sys.stdout.flush()
    print(file_path)
    sys.stdout.flush()


class GoExecutionScript(ABC):
    def __init__(self, json_params: str, process_fn: callable = None, isProgress: bool = False):
        self._json_params = json.loads(json_params)
        self._process_fn = process_fn
        self._error_handler = None
        self._progress = {"now": 0, "currentLabel": ""} if isProgress else None

    def start(self):
        try:
            if self._process_fn is not None:
                results = self._process_fn(self._json_params)
            else:
                results = self._custom_process(self._json_params)
            send_response(results)
        except BaseException as e:
            if self._error_handler is not None:
                self._error_handler(e)
            send_response(get_response_from_error(e))

    def _set_error_handler(self, error_handler: callable):
        self._error_handler = error_handler

    def _set_progress(self, progress: dict = None, label: str = None, now: int = None):
        if progress is not None:
            self._progress = progress
        else:
            if label is not None:
                self._progress["currentLabel"] = label
            if now is not None:
                self._progress["now"] = now

        sys.stdout.flush()
        print("progress-" + json.dumps(self._progress))
        sys.stdout.flush()

    @abstractmethod
    def _custom_process(self, json_params: dict) -> dict:
        """
        Override this method to implement a custom process
        """
        return get_response_from_error(toast="No process function was provided")