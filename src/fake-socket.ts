import { Todo, TodoList, todoApi } from "./todo-api";

export type CreateListMessage = {
    type: "createList";
    message: TodoList;
}

export type DeleteListMessage = {
    type: "deleteList";
    message: {
        index: number;
    };
}

export type AddTodoMessage = {
    type: "addToDo";
    message: {
        listIndex: number;
        item: Todo;
    };
}

export type RemoveTodoMessage = {
    type: "removeTodo";
    message: {
        listIndex: number;
        itemIndex: number;
    };
}

export type MoveTodoMessage = {
    type: "moveTodo";
    message: {
        listIndex: number;
        sourceIndex: number;
        destIndex: number;
    };
}

export type EditTodoMessage = {
    type: "editTodo";
    message: {
        listIndex: number;
        itemIndex: number;
        newValue: Todo;
    };
}

export type RawMessage = CreateListMessage | DeleteListMessage | AddTodoMessage | RemoveTodoMessage | MoveTodoMessage | EditTodoMessage;

export type SocketMessage = RawMessage & {sequenceId: number};


export type SocketClient = (message: SocketMessage) => void;

class FakeSocket {
    private clients : SocketClient[];
    private sequenceId : number;

    constructor() {
        this.clients = [];
        this.sequenceId = 0;
    }

    addListener(client: SocketClient) {
        this.clients.push(client);
    }

    removeListener(client: SocketClient) {
        this.clients = this.clients.filter((currentClient) => currentClient !== client);
    }

    dispatchMessage(message: RawMessage) {
        this.clients.forEach((client) => {
            const socketMessage : SocketMessage = {sequenceId: this.sequenceId, ...message }
            client(socketMessage);
        })
    }
}

class RandomActionExecutor {

    private running: boolean;
    private minPeriod: number; 
    private maxPeriod: number;
    private readonly actions = [this.moveTodo, this.addTodo, this.createList, this.deleteList, this.removeTodo];

    constructor() {
        this.running = false;
        this.minPeriod = 1;
        this.maxPeriod = 5;
    }

    /**
     * Start randomly performing actions against the fake api
     * 
     * @param minPeriod minimum period in seconds between two random actions
     * @param maxPeriod maximum period in seconds between two random actions
     */
    launch(minPeriod: number, maxPeriod: number) {
        if (this.minPeriod < 0 || this.maxPeriod < 0 || this.minPeriod >= this.maxPeriod) {
            throw new Error('min period must be inferior to max period and both must be positive');
        }
        this.running = true;
        this.minPeriod = minPeriod;
        this.maxPeriod = maxPeriod;
        this.nextExec();
    }

    stop() {
        this.running = false;
    }

    private nextExec() {
        const currentTimeout = (Math.floor(Math.random() * (this.maxPeriod - this.minPeriod)) + this.minPeriod) * 1000;
        window.setTimeout(() => {
            this.run();
        }, currentTimeout);
    }

    private run() {
        if (this.running) {
            this.performRandomAction();
            this.nextExec();
        }
    }

    private performRandomAction() {
        const actionIndex = this.getRandomIndex(this.actions);
        const action = this.actions[actionIndex]?.bind(this);
        if (action) {
            action();
        }
    }

    private getRandomIndex<T>(array: T[]) {
        return Math.floor(Math.random() * array.length);
    }

    private async moveTodo() {
        console.log("event generator move todo");
        try {
            const getTodoListsResponse = await todoApi.getTodoLists();
            if ('response' in getTodoListsResponse) {
                const todoLists = getTodoListsResponse.response;
                const listIndex = this.getRandomIndex(todoLists);
                const todoListItems = todoLists[listIndex]?.items;
                if (!todoListItems || !todoListItems?.length || todoListItems.length < 2) {
                    return;
                }
                const sourceIndex = this.getRandomIndex(todoListItems);
                let destIndex = this.getRandomIndex(todoListItems);
                while (destIndex === sourceIndex) {
                    destIndex = this.getRandomIndex(todoListItems);
                }
                todoApi.moveTodo(listIndex, sourceIndex, destIndex);
            }
        } catch(_e) {}
    }

    private async addTodo() {
        console.log("event generator add todo");
        try {
            const getTodoListsResponse = await todoApi.getTodoLists();
            if ('response' in getTodoListsResponse) {
                const todoLists = getTodoListsResponse.response;
                const listIndex = this.getRandomIndex(todoLists);
                let description = "";
                for(let i = 0; i < 15; i++) {
                    description += String.fromCharCode(97 + Math.floor(Math.random() * 26));
                }
                const newItem = {
                    done: Math.random() >= 0.5,
                    description 
                }
                todoApi.addTodo(listIndex, newItem);
            }
        } catch(_e) {
        }
    }

    private async removeTodo() {
        console.log("event generator remove todo");
        try {
            const getTodoListsResponse = await todoApi.getTodoLists();
            if ('response' in getTodoListsResponse) {
                const todoLists = getTodoListsResponse.response;
                const listIndex = this.getRandomIndex(todoLists);
                const todoListItems = todoLists[listIndex]?.items;
                if (!todoListItems || todoListItems.length === 0) {
                    return;
                }
                const itemIndex = this.getRandomIndex(todoListItems);
                todoApi.removeTodo(listIndex, itemIndex);
            }
        } catch(_e) {}
    }

    private createList() {
        console.log("event generator create list");
        try {
            let name = "";
            for(let i = 0; i < 5; i++) {
                name += String.fromCharCode(97 + Math.floor(Math.random() * 26));
            }
            todoApi.createList(name);
        } catch(_e) {}
    }

    private async deleteList() {
        console.log("event generator delete list");
        try {
            const getTodoListsResponse = await todoApi.getTodoLists();
            if ('response' in getTodoListsResponse) {
                const todoLists = getTodoListsResponse.response;
                if (todoLists.length === 0) {
                    return;
                }
                const listIndex = this.getRandomIndex(todoLists);
                todoApi.deleteList(listIndex);
            }
        } catch(_e) {}
    }
}

export const executor = new RandomActionExecutor();
export const socket = new FakeSocket();