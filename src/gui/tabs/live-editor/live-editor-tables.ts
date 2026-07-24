/** The tables present by default in the LiveEditorTab */

import { CardOptions } from "src/cards/card/card-options";
import { IColumnData, IRowData, IRowValues, RowValue } from "src/gui/table";
import { stripTagsFromString } from "src/utils/";

function addTitlesTo(columns: IColumnData[]): void {
    for (const column of columns) {
        let name: string = column.name;

        if (name === "Delete" || name === "Advanced" || !CardOptions[name]) {
            continue; // skip special columns and any option without a CardOptions entry
        }

        if (name === "VP") {
            name = "Victory Points";
        }

        column.rowsTitle = stripTagsFromString(CardOptions[name].description);
    }
}


const deleteButton = document.createElement("button");
deleteButton.innerHTML = "&#x2716;";
deleteButton.setAttribute("title", "Delete this row");
const advancedButton = document.createElement("button");
advancedButton.innerHTML = "&#x2699;"; // gear icon
advancedButton.setAttribute("title", "Advanced card options");
advancedButton.classList.add("advanced-button");

/** the headings for the cards defaults table on the LiveEditorTable */
export const defaultsHeadings: IColumnData[] = [
    {
        name: "Name",
        notEditable: true,
    },
    {
        name: "Set",
    },
    {
        name: "Set Text Color",
        color: true,
    },
    {
        name: "Set Background Color",
        color: true,
    },
    {
        name: "Copyright",
    },
    {
        name: "Legal",
       // longText: true,
    },
    {
        name: "Logo URL",
    },
    {
        name: "Logo Scale",
        type: "number",
        inputAttributes: {
            min: 0.010,
            max: 2,
            step: 0.001,
        },
    },
];


addTitlesTo(defaultsHeadings);
//https://i.imgur.com/J6SuXcE.png
/** the rows for the cards defaults table on the LiveEditorTable */
export const defaultsRows: IRowValues[] = [
    {
        name: "__defaults__",
        logoURL: "https://i.imgur.com/J6SuXcE.png",
        set: "Teen Titans",
        setTextColor: "#ffec34",
        setBackgroundColor: "#ed1c24",
        copyright: "2015 CZE",
        legal: "© & ™ DC Comics (s26)",
        logoScale: 0.975,
    },
    /*{
        name: '__oversized_defaults__',
        logoScale: 0.975,
        setTextColor: '#ffec34',
        setBackgroundColor: '#ed1c24',
    },*/
];

/** the headings for the custom cards table on the LiveEditorTable 
 * note fields in the advanced sidebar are defined in live-editor.ts
*/
export const cardsHeadings: IColumnData[] = [
    {
        name: "Name",
    },
    {
        name: "Type",
        allowedValues: ["Equipment", "Hero", "Hostage", "Location", "Starter", "Super Power", "Villain", "Typeless", "Basic", "Weakness", "Super Move", "Crisis"],
    },
    {
        name: "Text",
        longText: true,
    },
    {
        name: "Cost",
        type: "number",
    },
    {
        name: "VP",
        id: "victoryPoints",
        type: "number",
    },
    {
        name: "Subtype",
    },
   /*moved these fields to advanced
    {
        name: "Variant",
        type: "boolean",
    },
       {
        name: "Bannerrows",
        id: "Bannerrows",
        type: "number",
    },
    {
        name: "destination",
        id: "destination",
        type: "number",
        inputAttributes: {
            min: 0,
            max: 5,
            step: 1,
        },
    },
    */
    {
        name: "Advanced",
        id: "advanced",
        type: "node",
        defaultValue: advancedButton,
    },
    {
        name: "Oversized",
        type: "boolean",
        transform: (checked: RowValue, row: IRowData) => {
            if (checked && row.values.type !== "Hero" && row.values.type !== "Villain" && row.values.type !== "Location") {
                return false;
            }
            return checked;
        },
    },
    {
        name: "Image URL",
    },
    {
        name: "Delete",
        type: "node",
        defaultValue: deleteButton,
    },
];
addTitlesTo(cardsHeadings);
/** the rows for the custom cards table on the LiveEditorTable */
export const cardsRows: IRowValues[] = [
    {
        name: "Vulnerability",
        type: "Starter",
        text: "",
        imageURL: "https://i.imgur.com/em2ZPJG.png",
        vp: 0,
        cost: 0,
    },
    {
        name: "Wonder Girl",
        type: "Hero",
        oversized: true,
        imageURL: "https://i.imgur.com/RjNwCAX.png",
        text: "Once during each of your turns, if you control two or more "
            + "Equipment, draw two cards and then discard a card.",
    },
];
