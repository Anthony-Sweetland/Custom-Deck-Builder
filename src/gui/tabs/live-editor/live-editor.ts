import * as PIXI from "pixi.js";
import { Card, CARD_MAX_HEIGHT, CARD_MAX_WIDTH, LANDSCAPE_CARD_MAX_WIDTH } from "src/cards/card/";
import { EditableTable, IRowData, IRowValues } from "src/gui/table";
import { Tab } from "src/gui/tabular/";
import { clone, select, template } from "src/utils/";
import * as store from "store";
import { cardsHeadings, cardsRows, defaultsHeadings, defaultsRows } from "./live-editor-tables";
import * as hbs from "./live-editor.hbs";
import "./live-editor.scss";

const tabTemplate = template(hbs as any);

/** The Live Editor tab of a Tabular */
export class LiveEditorTab extends Tab {
    /** The container element for all rendered card canvases */
    private canvasesElement: HTMLElement;

    /** The scale slider element */
    private scaleSlider: HTMLInputElement;

    /** The scale slider percent text element */
    private scaleSliderPercent: HTMLElement;

    /** The add row button element */
    private addRowButton: HTMLButtonElement;

    /** The reset to defaults button element */
    private resetToDefaultsButton: HTMLButtonElement;

    /** The defaults EditableTable */
    private defaultsTable: EditableTable;

    /** The custom cards EditableTable */
    private cardsTable: EditableTable;

    /** The PIXI application that we use to render cards off screen */
    private app: PIXI.Application;

    /** The PIXI.Graphics we use to clear the canvas before a re-render */
    private clearGraphics: PIXI.Graphics;

    /** The maximum number of cards users can create before we stop them */
    private maxCustomCards: number = 6;

    /** The warning container for when there are too many cards */
    private tooManyCardsElement: HTMLElement;

    /**
     * Row to card mapping of all custom cards
     * As all cards as static when not changed we store the results in a canvas
     * outside of the PIXI instance, so we can manipulate them like regular DOM
     * elements
     */
    private cards = new Map<IRowData, Card>();

    /** Row to card's canvas of all custom cards */
    private canvases = new Map<IRowData, HTMLCanvasElement>();

     /** The Advanced Options side drawer overlay element */
    private advancedDrawer: HTMLElement;

    /** The row currently being edited in the Advanced drawer, if any */
    private advancedDrawerRow: IRowData | null = null;

    /** The Variant checkbox inside the Advanced drawer */
    private advancedVariantInput: HTMLInputElement;

    /** The CONDITIONAL COST checkbox inside the Advanced drawer */
    private advancedConditionalCostInput: HTMLInputElement;
    
    /** The CONDITIONAL VP checkbox inside the Advanced drawer */
    private advancedConditionalVPInput: HTMLInputElement;
    
    /** The Transformed checkbox inside the Advanced drawer */
    private advancedTransformedInput: HTMLInputElement;

    /** The Bannerrows number input inside the Advanced drawer */
    private advancedBannerrowsInput: HTMLInputElement;

    /** The destination number input inside the Advanced drawer */
    private advancedDestinationInput: HTMLInputElement;

    /** The destination number input inside the Advanced drawer */
    private advancedBribeInput: HTMLInputElement;

    /** Creates a new instance of the LiveEditorTab */
    constructor() {
        super("Live Editor", tabTemplate() as HTMLElement);

        this.tooManyCardsElement = select(this.element, ".too-many-cards");
        this.canvasesElement = select(this.element, ".canvases");
        this.addRowButton = select(this.element, ".add-row-button") as HTMLButtonElement;

        this.scaleSlider = select(this.element, ".canvases-scale-slider") as HTMLInputElement;
        this.scaleSlider.addEventListener("input", () => this.resizeCanvases());

        this.scaleSliderPercent = select(this.element, ".canvases-scale-percent");
        this.scaleSlider.value = store.get("card-scale") || 0.5;

        // Defaults Table \\
        this.defaultsTable = new EditableTable(select(this.element, ".defaults-table"));
        this.defaultsTable.addColumns(defaultsHeadings);

        this.defaultsTable.on(EditableTable.EventSymbols.rowAdded, (rowValues: IRowValues, row: IRowData) => {
            setTimeout(() => row.tr.classList.add("shown"), 50);
        });

        // if the defaults rows are edited, update all custom cards
        this.defaultsTable.on(EditableTable.EventSymbols.cellChanged, (row: IRowData): void => {
            this.updateStore(this.defaultsTable);
            this.renderAllCards();
        });

        this.defaultsTable.addRows(store.get("card-defaults") || defaultsRows);

        // Custom Cards Table \\
        const cardsElement = select(this.element, ".cards-table");
        this.cardsTable = new EditableTable(cardsElement);

        this.cardsTable.on(EditableTable.EventSymbols.rowAdded, (rowValues: IRowValues, row: IRowData) => {
            this.updateStore(this.cardsTable);
            this.rowAdded(row);
        });

        this.cardsTable.on(EditableTable.EventSymbols.cellChanged, (row: IRowData) => {
            this.updateStore(this.cardsTable);
            this.renderCard(row);
        });

        this.cardsTable.on(EditableTable.EventSymbols.rowDeleted, (row: IRowData) => {
            this.updateStore(this.cardsTable);
            this.rowDeleted(row);
        });

        // Rendering related tasks \\
        this.app = new PIXI.Application(LANDSCAPE_CARD_MAX_WIDTH, CARD_MAX_HEIGHT, {antialias: true, transparent: true});

        this.clearGraphics = new PIXI.Graphics();
        this.app.stage.addChild(this.clearGraphics);

        this.cardsTable.addColumns(cardsHeadings);
        this.cardsTable.addRows(store.get("cards") || cardsRows);

        this.addRowButton.addEventListener("click", () => {
            this.cardsTable.addRow(cardsRows[0]);
        });

        this.resetToDefaultsButton = select(this.element, ".reset-to-defaults") as HTMLButtonElement;
        this.resetToDefaultsButton.addEventListener("click", () => {
            this.resetToDefaults();
        });
    }

    /**
     * Invoked when a row is added to the Custom Cards table
     * @param row the row that was added, we need to render it
     */
    private rowAdded(row: IRowData): void {
        const canvas = document.createElement("canvas");

        setTimeout(() => {
            canvas.classList.add("shown");
            row.tr.classList.add("shown");
        }, 50);

        const deleteButton = row.values.delete as HTMLButtonElement;
        deleteButton.addEventListener("click", () => {
            row.tr.classList.remove("shown");
            canvas.classList.remove("shown");
            this.checkMaxCards(this.cardsTable.rows.length - 1);

            setTimeout(() => {
                this.cardsTable.deleteRow(row);
            }, 355); // css animation variable
        });

        const card = new Card(row.values);
        this.cards.set(row, card);
        const advancedButton = row.values.advanced as HTMLButtonElement;
        advancedButton.addEventListener("click", () => {
            this.openAdvancedDrawer(row);
        });

        this.canvases.set(row, canvas);
        this.canvasesElement.appendChild(canvas);

        this.renderCard(row);
        this.checkMaxCards(this.cardsTable.rows.length);
    }

    /**
     * Invoked when a row is deleted from the Custom Cards table
     * @param row the row that was deleted, we will remove its canvas and card
     */
    private rowDeleted(row: IRowData): void {
        this.updateStore(this.cardsTable);

        this.cards.delete(row);
        this.canvases.get(row).remove();
        this.canvases.delete(row);
    }
private rowDeleted(row: IRowData): void {
        if (this.advancedDrawerRow === row) {
            this.closeAdvancedDrawer();
        }

        this.updateStore(this.cardsTable);

        this.cards.delete(row);
        this.canvases.get(row).remove();
        this.canvases.delete(row);
    }

    /**
     * (re) renders all cards, invoked when a card wide (Card Default) row is
     * edited
     */
    private renderAllCards(): void {
        for (const row of this.cardsTable.getAllRows()) {
            this.renderCard(row);
        }
    }

    /**
     * (re)-renders a card to its canvas asynchronous
     * @param row the row of the card to render
     */
    private renderCard(row: IRowData): void {
        const card = this.cards.get(row);
        const canvas = this.canvases.get(row);

        // clear the renderer
        this.clearGraphics.beginFill(0x000000, 0);
        this.clearGraphics.drawRect(0, 0, card.pxWidth, card.pxHeight);

        const defaults = clone(this.defaultsTable.getRow(0).values);
        const args = clone(defaults, row.values);

        card.setFrom(args);

        card.render().then((container: PIXI.Container) => {
            this.checkForErrors(row, card);

            this.app.stage.addChild(container);
            this.app.render();

            canvas.width = card.pxWidth;
            canvas.height = card.pxHeight;
            canvas.getContext("2d").drawImage(this.app.view, 0, 0);
            this.app.stage.removeChild(container);

            this.resizeCanvases(canvas);
        });
    }

    /**
     * Resizes all card canvases. Invoked when the scale slider is changed
     * @param canvas a specific and singular canvas to scale, or all if this
     *               is omitted
     */
    private resizeCanvases(canvas?: HTMLCanvasElement): void {
        const scale = Number(this.scaleSlider.value);
        const asPercent = Math.round(scale * 10000) / 100;
        this.scaleSliderPercent.innerHTML = `${asPercent}%`;
        store.set("card-scale", scale);

        let elements;
        if (canvas) {
            elements = [canvas];
        }
        else {
            elements = this.canvasesElement.getElementsByTagName("canvas");
        }

        for (const element of elements) {
            const width = Number(element.getAttribute("width"));
            const height = Number(element.getAttribute("height"));

            element.style.width = `${width * scale}px`;
            element.style.height = `${height * scale}px`;
        }
    }

    /**
     * Checks for errors such as image url cells that are invalid urls that
     * cannot be loaded
     * @param row the row to check for errors in
     * @param card the card to check for errors in
     */
    private checkForErrors(row: IRowData, card: Card): void {
        this.checkIfImageLoaded(row, card, "imageURL");
        this.checkIfImageLoaded(this.defaultsTable.rows[0], card, "logoURL");
    }

    /**
     * Checks if a given image URL has been loaded into the PIXI.Loader
     * @param row the row to check for
     * @param card the card to card images from
     * @param key the column key we are checking, such as 'imageURL' or
     *            'logoURL'
     */
    private checkIfImageLoaded(row: IRowData, card: Card, key: string): void {
        const resource = PIXI.loader.resources[(card as any)[key]];
        const td = row.tr.getElementsByClassName(`column-${key}`)[0];

        td.classList.toggle("error", Boolean(resource.error) || !resource || !resource.texture);
    }

    /**
     * Updates the store library with custom cards so page reloads do not loose
     * card editing progress
     * @param table the table to store
     */
    private updateStore(table: EditableTable): void {
        const storeKey = table === this.cardsTable
            ? "cards"
            : "card-defaults";

        store.set(storeKey, table.rows.map((row: IRowData) => row.values));
    }

    /**
     * Resets all EditableTables to their default values, and clears stores
     */
    private resetToDefaults(): void {
        const cards = this.cardsTable.rows.slice();
        for (const row of cards) {
            row.tr.classList.remove("shown");
            this.canvases.get(row).classList.remove("shown");
        }

        const defaults = this.defaultsTable.rows.slice();
        for (const row of defaults) {
            row.tr.classList.remove("shown");
        }

        this.scaleSlider.value = String(0.5);

        setTimeout(() => {
            for (const row of cards) {
                this.cardsTable.deleteRow(row);
            }

            for (const row of defaults) {
                this.defaultsTable.deleteRow(row);
            }

            setTimeout(() => {
                this.defaultsTable.addRows(defaultsRows);
                this.updateStore(this.defaultsTable);

                this.cardsTable.addRows(cardsRows);
                this.updateStore(this.cardsTable);
            }, 50);
        }, 355);
    }
      /**
     * Lazily builds the Advanced Options side drawer (once) and attaches it
     * to the tab element
     */
    private ensureAdvancedDrawer(): void {
        if (this.advancedDrawer) {
            return;
        }

        const overlay = document.createElement("div");
        overlay.className = "advanced-drawer-overlay";

        const drawer = document.createElement("div");
        drawer.className = "advanced-drawer";

        const header = document.createElement("div");
        header.className = "advanced-drawer-header";

        const title = document.createElement("span");
        title.textContent = "Advanced Options";

        const close = document.createElement("button");
        close.type = "button";
        close.innerHTML = "&#x2716;";
        close.setAttribute("title", "Close");
        close.addEventListener("click", () => this.closeAdvancedDrawer());

        header.appendChild(title);
        header.appendChild(close);

        const body = document.createElement("div");
        body.className = "advanced-drawer-body";

        // Variant (boolean)
        const variantLabel = document.createElement("label");
        variantLabel.className = "advanced-drawer-field";
        variantLabel.appendChild(document.createTextNode("Variant"));
        const variantInput = document.createElement("input");
        variantInput.type = "checkbox";
        variantInput.addEventListener("change", () => this.applyAdvancedValues());
        variantLabel.appendChild(variantInput);

         //  Condtional Cost (boolean)
        const ConditionalCostLabel = document.createElement("label");
        ConditionalCostLabel.className = "advanced-drawer-field";
        ConditionalCostLabel.appendChild(document.createTextNode("Conditional Cost (*)"));
        const ConditionalCostInput = document.createElement("input");
        ConditionalCostInput.type = "checkbox";
        ConditionalCostInput.addEventListener("change", () => this.applyAdvancedValues());
        ConditionalCostLabel.appendChild(ConditionalCostInput);

         //  Condtional VP (boolean)
        const ConditionalVPLabel = document.createElement("label");
        ConditionalVPLabel.className = "advanced-drawer-field";
        ConditionalVPLabel.appendChild(document.createTextNode("Conditional VP (*)"));
        const ConditionalVPInput = document.createElement("input");
        ConditionalVPInput.type = "checkbox";
        ConditionalVPInput.addEventListener("change", () => this.applyAdvancedValues());
        ConditionalVPLabel.appendChild(ConditionalVPInput);

        //  Transformed (boolean)
        const TransformedLabel = document.createElement("label");
        TransformedLabel.className = "advanced-drawer-field";
        TransformedLabel.appendChild(document.createTextNode("Transformed (hero, villain, equipment, or Starter)"));
        const TransformedInput = document.createElement("input");
        TransformedInput.type = "checkbox";
        TransformedInput.addEventListener("change", () => this.applyAdvancedValues());
        TransformedLabel.appendChild(TransformedInput);

        // Bannerrows (number)
        const bannerrowsLabel = document.createElement("label");
        bannerrowsLabel.className = "advanced-drawer-field";
        bannerrowsLabel.appendChild(document.createTextNode("Bannerrows"));
        const bannerrowsInput = document.createElement("input");
        bannerrowsInput.type = "number";
        bannerrowsInput.addEventListener("change", () => this.applyAdvancedValues());
        bannerrowsLabel.appendChild(bannerrowsInput);

        // destination (number, 0-5)
        const destinationLabel = document.createElement("label");
        destinationLabel.className = "advanced-drawer-field";
        destinationLabel.appendChild(document.createTextNode("Destination - Villains"));
        const destinationInput = document.createElement("input");
        destinationInput.type = "number";
        destinationInput.min = "0";
        destinationInput.max = "5";
        destinationInput.step = "1";
        destinationInput.addEventListener("change", () => this.applyAdvancedValues());
        destinationLabel.appendChild(destinationInput);

// bribe (number, 0-5)
        const bribeLabel = document.createElement("label");
        bribeLabel.className = "advanced-drawer-field";
        bribeLabel.appendChild(document.createTextNode("Bribe - regular sized cards"));
        const bribeInput = document.createElement("input");
        bribeInput.type = "number";
        bribeInput.min = "0";
        bribeInput.max = "5";
        bribeInput.step = "1";
        bribeInput.addEventListener("change", () => this.applyAdvancedValues());
        bribeLabel.appendChild(bribeInput);


        body.appendChild(variantLabel);
        body.appendChild(ConditionalCostLabel);
        body.appendChild(ConditionalVPLabel);
        body.appendChild(TransformedLabel);
        body.appendChild(bannerrowsLabel);
        body.appendChild(destinationLabel);
        body.appendChild(bribeLabel);

        drawer.appendChild(header);
        drawer.appendChild(body);
        overlay.appendChild(drawer);

        // clicking the dimmed backdrop closes the drawer
        overlay.addEventListener("click", (event: MouseEvent) => {
            if (event.target === overlay) {
                this.closeAdvancedDrawer();
            }
        });

        this.advancedVariantInput = variantInput;
        this.advancedConditionalCostInput = ConditionalCostInput;
        this.advancedConditionalVPInput = ConditionalVPInput;
        this.advancedTransformedInput = TransformedInput;
        this.advancedBannerrowsInput = bannerrowsInput;
        this.advancedDestinationInput = destinationInput;
        this.advancedBribeInput = bribeInput;
        this.advancedDrawer = overlay;

        document.body.appendChild(overlay);
    }

    /**
     * Opens the Advanced drawer for a specific row, pre-filling its values
     * @param row the row whose advanced options we are editing
     */
    private openAdvancedDrawer(row: IRowData): void {
        this.ensureAdvancedDrawer();
        this.advancedDrawerRow = row;

        this.advancedVariantInput.checked = Boolean(row.values.variant);
        this.advancedConditionalCostInput.checked = Boolean(row.values.ConditionalCost);
        this.advancedConditionalVPInput.checked = Boolean(row.values.ConditionalVP);
        this.advancedTransformedInput.checked = Boolean(row.values.Transformed);
        this.advancedBannerrowsInput.value =
            row.values.Bannerrows != null ? String(row.values.Bannerrows) : "";
        this.advancedDestinationInput.value =
            row.values.destination != null ? String(row.values.destination) : "";
        this.advancedBribeInput.value =
            row.values.bribe != null ? String(row.values.bribe) : "";

        this.advancedDrawer.classList.add("open");
    }

    /**
     * Closes the Advanced drawer
     */
    private closeAdvancedDrawer(): void {
        if (!this.advancedDrawer) {
            return;
        }
        this.advancedDrawer.classList.remove("open");
        this.advancedDrawerRow = null;
    }

    /**
     * Writes the drawer's inputs back into the active row, persists to the
     * store, and re-renders the card. Mirrors what cellChanged does for
     * normal table cells.
     */
    private applyAdvancedValues(): void {
        const row = this.advancedDrawerRow;
        if (!row) {
            return;
        }

        row.values.variant = this.advancedVariantInput.checked;
        row.values.ConditionalCost = this.advancedConditionalCostInput.checked;
        row.values.ConditionalVP = this.advancedConditionalVPInput.checked;
        row.values.Transformed = this.advancedTransformedInput.checked;
        this.setOptionalNumber(row, "Bannerrows", this.advancedBannerrowsInput.value);
        this.setOptionalNumber(row, "destination", this.advancedDestinationInput.value);
        this.setOptionalNumber(row, "bribe", this.advancedBribeInput.value);

        this.updateStore(this.cardsTable);
        this.renderCard(row);
    }

    /**
     * Sets a numeric value on a row, or deletes it when the input is blank
     * so we never store Number("") === 0
     * @param row the row to update
     * @param key the value key, e.g. "Bannerrows" "Bribe" or "destination"
     * @param value the raw string from the input
     */
    private setOptionalNumber(row: IRowData, key: string, value: string): void {
        if (value === "") {
            delete (row.values as any)[key];
            return;
        }
        (row.values as any)[key] = Number(value);
    }

    /**
     * Checks if the user hit the maximum number of cards and we need to show or
     * hide elements accordingly
     * @param numberOfCards the number of cards there will be
     */
    private checkMaxCards(numberOfCards: number): void {
        const tooManyCards = (numberOfCards >= this.maxCustomCards);

        this.addRowButton.disabled = tooManyCards;
        this.tooManyCardsElement.classList.toggle("collapsed", !tooManyCards);
    }
}
