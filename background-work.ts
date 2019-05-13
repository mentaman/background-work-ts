export class WorkGenerator {
    checkEveryms: number = 100;
    maxWorking: number = 4;
    
    workCount: number = 0;
    
    waiting: Work[] = [];
    working: {[id: string]: Work} = {};
    works: {[id: string]: Work} = {};
    worksNames: {[id: string]: Work[]} = {};

    constructor(maxWorking: number = 4) {
        setInterval(() => {
            for(let work of Object.values(this.works)) {
                let wasTimeouted = !work.timeoutAt || new Date().getTime() > work.timeoutAt.getTime();
                let wasNotAsked = !work.askMaxDelay || new Date().getTime()-work.lastAsk.getTime() > work.askMaxDelay*1000;
                if(wasTimeouted || wasNotAsked)
                {
                    if(!work.cleanedStuff) {
                        work.cleanStuff();
                    }
                    work.clean();
                }
            }
            this.checkWaiting();
        }, this.checkEveryms);
        this.maxWorking = maxWorking;
    }
    
    getWorker(id: string): Work {
        return this.works[id];
    }

    getWorkersByName(name: string): Work[] {
        return this.worksNames[name] || [];
    }
    
    //TODO: use cancel token to also cancel the work promise itself.. 
    cleanWork(work: Work) {
        if(!this.works[work.workId]) {
            return;
        }
        if(!work.cleanedStuff) work.cleanStuff();
        console.log("clean");
        work.status = "cleaned";
        
        delete this.works[work.workId];
        
        this.worksNames[work.name] = this.worksNames[work.name].filter(w => w.workId === work.workId);
        if(this.worksNames[work.name].length === 0) {
            delete this.worksNames[work.name];
        }

        if(this.working[work.workId]) delete this.working[work.workId];
    }

    addToWaiting(name: string, workfunc: (work: Work) => Promise<any>, timeoutdate: Date, askMaxDelaySeconds: number) {
        let workId = this.workCount++;
        let work = new Work();
        work.workId = workId.toString();
        work.name = name;
        work.workfunc = workfunc;
        work.status = "waiting";
        work.timeoutAt = timeoutdate;
        work.lastAsk = new Date();
        work.askMaxDelay = askMaxDelaySeconds;
        work.data = {};
        work.generator = this;
        this.waiting.push(work);
        this.works[work.workId] = work;
        if(!this.worksNames[work.name]) {
            this.worksNames[work.name] = [];
        }
        this.worksNames[work.name].push(work);
        setTimeout(() => {
            this.checkWaiting();
        }, 0);
        return work;
    }

    
    checkWaiting() {
        if(this.waiting.length > 0) {
            if(this.maxWorking === 0 || Object.keys(this.working).length < this.maxWorking) {
                let current: Work = this.waiting.pop();
                current.status = "working";
                this.working[current.workId] = current;
                this.runWork(current);
            }
        }
    }

    

    async runWork(work: Work) {
        try {
            console.log(`start work! ${work.workId} ${work.name}`);
            let res = await work.workfunc(work);
            console.log(`done work! ${work.workId} ${work.name}`);
            if(res != undefined) {
                work.data = res;
            }
            console.log(`complete ${work.workId} ${work.name}`);
            work.complete();
        } catch(e) {
            console.log(`error work ${work.workId} ${work.name}`, e);
            work.cleanStuff();
            work.status = "failed";
        }
    }
}



export class Work {
    cleanedStuff: boolean = false;
    status: Status;
    workfunc: (work: Work) => Promise<any>;
    workId: string;
    name: string;
    data: any;
    timeoutAt: Date;
    lastAsk: Date;
    askMaxDelay: number;
    generator: WorkGenerator;
    ask() {
        this.lastAsk = new Date();
    }
    complete() {
        this.status = "done";
        delete this.generator.working[this.workId];
    }
    clean() {
        this.generator.cleanWork(this);
    }
    cleanStuff() {
        this.onCleanStuff();
        this.cleanedStuff = true;
    }
    onCleanStuff() {

    }
}
 
export type Status = "waiting" | "working" | "done" | "cleaned" | "failed";


