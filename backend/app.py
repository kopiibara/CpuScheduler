from flask import Flask, request, jsonify
from flask_cors import CORS
from services.system_info_service import SystemInfoService
from services.scheduling_service import SchedulingService

app = Flask(__name__)
CORS(app)

scheduling_service = SchedulingService()

@app.route('/api/simulate', methods=['POST'])
def simulate():
    try:
        data = request.get_json()
        processes = data.get('processes')
        algorithm = data.get('algorithm')
        time_quantum = data.get('timeQuantum')

        if not processes or not isinstance(processes, list):
            return jsonify({'error': 'Invalid processes data'}), 400

        if not algorithm:
            return jsonify({'error': 'Algorithm not specified'}), 400

        algorithm = algorithm.lower()
        result = None

        if algorithm == 'fcfs':
            result = scheduling_service.fcfs(processes)
        elif algorithm == 'sjf':
            result = scheduling_service.sjf(processes)
        elif algorithm == 'priority':
            result = scheduling_service.priority(processes)
        elif algorithm == 'rr':
            if not time_quantum:
                return jsonify({'error': 'Time quantum not specified for Round Robin'}), 400
            result = scheduling_service.round_robin(processes, time_quantum)
        else:
            return jsonify({'error': 'Invalid algorithm specified'}), 400

        return jsonify(result)

    except Exception as e:
        print(f"Scheduling simulation error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000) 