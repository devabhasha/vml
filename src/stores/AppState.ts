import { observable, computed, action, ObservableMap, map, toJS, IObservableArray } from "mobx";
import * as ExecutionEnvironment from "fbjs/lib/ExecutionEnvironment";
import { isEqual } from "lodash";
import * as History from "history";
import { Models } from "vml-common";

import { Encoding, Environment, FetchLevel } from "../shared/interfaces";
import { encodingSchemes } from "../shared/constants";
import { StanzaData, SnackbarInfo } from "../shared/interfaces";

let instance: AppState = null;

export class AppState {
    currentLocation: History.Location;
    @observable encoding: Encoding = Encoding.devanagari;
    @observable env: Environment;
    @observable private dataFetchStore: ObservableMap<FetchLevel>;
    @observable loadingStanzaDialog: StanzaData;
    @observable editedStanza: Models.Stanza;
    @observable snackbars: SnackbarInfo[];
    @observable annotateMode: boolean;
    @observable selectedStanzas: string[];
    editedWord: Models.Word;

    constructor(initialState?: AppState) {

        if (!instance) {
            instance = this;
        }

        this.currentLocation = initialState ? initialState.currentLocation : {};
        this.env = ExecutionEnvironment.canUseDOM ? Environment.Client : Environment.Server;
        this.snackbars = [];
        this.annotateMode = false;
        this.selectedStanzas = [];
        if (this.isClientEnv) {
            this.dataFetchStore = map({});
            this.loadingStanzaDialog = null;
            this.editedStanza = null;
            let encodingFromStorage = localStorage.getItem("encoding");
            if (encodingFromStorage) {
                this.setEncoding(parseInt(localStorage.getItem("encoding")));
            }
            // autorun(() => console.log(this.selectedStanzas.sort((a, b) => parseInt(a) > parseInt(b) ? 1 : -1)));
        }

        return instance;
    }

    @action
    addFetch = (url: string, level: FetchLevel) => {

        this.dataFetchStore.set(url, level);
    }

    @action
    deleteFetch = (url: string) => {

        this.dataFetchStore.delete(url);
    }

    @action
    setAnnotateMode = (on: boolean) => {

        this.annotateMode = on;
    }

    @action
    openStanzaDialog = (documentURL: string, runningStanzaId: string) => {

        const stanzaURL = Models.Stanza.URLFromDocURL(documentURL, runningStanzaId);

        this.loadingStanzaDialog = {
            runningId: runningStanzaId,
            stanzaURL
        };
    }

    @action
    closeStanzaDialog = () => {

        this.loadingStanzaDialog = null;
    }

    @computed
    get pendingAppFetches() {

        return this.dataFetchStore.values().filter(url => url === FetchLevel.App);
    }

    @computed
    get isClientEnv() {

        return this.env === Environment.Client;
    }

    @computed
    get encodingScheme() {

        return encodingSchemes.filter(scheme => scheme.value === this.encoding)[0];
    }

    setCurrentLocation(location: History.Location) {

        this.currentLocation = location;
    }

    @action
    setEncoding(encoding: Encoding) {

        this.encoding = encoding;
        if (ExecutionEnvironment.canUseDOM) {
            localStorage.setItem("encoding", encoding.toString());
        }
    }

    @action
    showSnackbar = (snackbar: SnackbarInfo) => {

        if (this.isClientEnv) {
            this.snackbars.push(snackbar);
        };
    }

    @action
    getNextSnackbar() {

        if (this.snackbars.length) {
            this.snackbars.shift();
        }
    }

    @computed
    get snackbar() {

        return this.snackbars.length ? this.snackbars[0] : null;
    }

    @action
    setEditedStanza = (stanza: Models.Stanza) => {

        if (this.editedStanza && this.editedStanza.runningId === stanza.runningId) {
            return;
        }

        this.editedStanza = new Models.Stanza(toJS(stanza));
    }

    @action
    updateEditedWord = (word: Models.Word) => {

        let analysisUpdated = false;
        const newEditedStanza = new Models.Stanza(toJS(this.editedStanza));
        const wordFromEditedStanza: Models.Word = newEditedStanza
            .lines.find(line => line.id === word.lineId)
            .words.find(w => w.id === word.id);

        const updatedWord: Models.Word = toJS(word);

        if (!isEqual(wordFromEditedStanza, updatedWord)) {
            if (!wordFromEditedStanza.analysis
                || !isEqual(wordFromEditedStanza.analysis.map(token => token.token), updatedWord.analysis.map(token => token.token))) {
                analysisUpdated = true;
            }
            wordFromEditedStanza.definition = updatedWord.definition;
            wordFromEditedStanza.analysis = updatedWord.analysis;
            this.editedStanza = newEditedStanza;
        }

        return analysisUpdated;
    }

    @action
    deleteEditedStanza = () => {

        this.editedStanza = null;
    }

    setEditedWord = (word: Models.Word) => {

        this.editedWord = Object.assign({}, toJS(word));
    }

    unsetEditedWord = () => {

        this.editedWord = null;
    }

    @action
    selectStanza = (runningId: string) => {

        this.selectedStanzas.push(runningId);
    }

    @action
    deselectStanza = (runningId: string) => {

        (<IObservableArray<string>>this.selectedStanzas).remove(runningId);
    }

    @action
    resetStanzaSelection = () => {

        this.selectedStanzas = [];
    }

    @computed
    get stanzaSelectMode() {

        return this.selectedStanzas.length > 0;
    }

    @computed
    get hashFromSelectedStanzas() {

        if (this.selectedStanzas.length === 0) {
            return "";
        }

        return "#p" + this.selectedStanzas.sort((a, b) => parseInt(a) > parseInt(b) ? 1 : -1)
            .reduce((prev, curr, index, array) => {

                const ranges = prev.split(",");
                const lastRange = ranges[ranges.length - 1];
                const lastRangeTokens = lastRange.split("-");
                const lastToken = lastRangeTokens[lastRangeTokens.length - 1];
                const lastTokenAsNumber = parseInt(lastToken);
                const currentTokenAsNumber = parseInt(curr);
                if (currentTokenAsNumber !== lastTokenAsNumber + 1) {
                    return prev + "," + curr;
                }
                else if (lastRangeTokens.length === 2) {
                    return prev.replace(/\d+$/, curr);
                }

                return prev + "-" + curr;
            });
    }

    @action
    selectStanzasFromHash = (hash: string) => {

        if (hash !== "") {
            const hashRegex = /(?:^#p)([\d-,]*\d$)/g;
            const selectionList: string = hash.match(hashRegex) && hash.split("#p")[1];
            const selectedStanzas = selectionList && selectionList.split(",").map(group => {

                const expandedStanzas: string[] = [];
                const range = group.split("-");
                if (range.length === 2) {
                    for (let i = parseInt(range[0]); i <= parseInt(range[1]); i++) {
                        expandedStanzas.push(i.toString());
                    }
                } else {
                    expandedStanzas.push(range[0]);
                }
                return expandedStanzas;
            }).reduce((prev, curr) => prev.concat(curr));
            this.selectedStanzas = selectedStanzas || [];
        }
        else {
            this.selectedStanzas = [];
        }
    }
}
