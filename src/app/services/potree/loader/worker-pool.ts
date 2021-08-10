export class WorkerPool {
    private workers : object;

	constructor(){
		this.workers = {};
	}

	getWorker(url : string){
		if (!this.workers[url]) {
			this.workers[url] = [];
		}

		if (this.workers[url].length === 0) {
            let worker = new Worker(url, { type: 'module' });
			this.workers[url].push(worker);
		}

		let worker = this.workers[url].pop();

		return worker;
	}

	returnWorker(url, worker){
		this.workers[url].push(worker);
	}
};
