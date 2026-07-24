import {
    autoSizeAndWrapStyledText, loadTextures, newSprite, replaceAll,
    surroundText, wrapStyledText, wrapStyledTextCharacters,
} from "src/utils/";
import { getStyle } from "./card-styles";

/** The maximum width (in pixels) that a card can be (oversized) */
export const CARD_MAX_WIDTH = 900;

/** The maximum height (in pixels) that a card can be (oversized) */
export const CARD_MAX_HEIGHT = 1200;

///Setup for rotated Location cards ie. Multiverse locations.
/** The maximum width (in pixels) that a card can be when turned Landscape (Oversized)) */
export const LANDSCAPE_CARD_MAX_WIDTH = 1200;
/** The maximum height (in pixels) that a card can be when turned Landscape (Oversized))*/
export const LANDSCAPE_CARD_MAX_HEIGHT = 900;



/**
 * represents a custom card
 */
export class Card {
    /** Keywords that are automatically bolded for all card text */
    public static readonly autoBoldKeywords = [
        "+Power",
        "Assist",
        "Attacked",
        "Attack ",
        "Attack:",
        "Attack.",
        "Block",
        "Bombshell Attack",
        "Confrontation",
        "Defense:",
        "First Appearance — Attack",
        "Ongoing:",
        "Ninjutsu;",
        "Retaliation:",
        "Weakness",
        "Speedster",
        "Surge",
        "Transform ",
        "Transform.",
        "Transform:",
        "Seal ",
        "Seal.",
        "Seal:",
        "Reward:",
        ":",
    ];


     /** The current width in pixels of the rendered card */
    public pxWidth = CARD_MAX_WIDTH;
    public pxWidthL = LANDSCAPE_CARD_MAX_WIDTH
    /** The current height in pixels of the rendered card */
    public pxHeight = CARD_MAX_HEIGHT;
    public pxHeightL = LANDSCAPE_CARD_MAX_HEIGHT

     /** The name of the card */
    public name: string = "Card Name";

    /** The type of the card, used for background generation */
    public type: "Equipment" | "Hero" | "Hostage" | "Location" | "Starter" | "Crisis"| "Super Power" | "Villain" | "Typeless" | "Basic" | "Weakness" = "Starter"|"startertransformed"| "equipment-transformed" | "hero-transformed" | "villain-transformed" | "supermove" ;

    /** If this card is a variant with black background text */
    public variant: boolean = false;
    /** If this card has a ConditionalCost */
    public ConditionalCost: boolean = false;
    /** If this card has a ConditionalVP */
    public ConditionalVP: boolean = false;
    /** If this card is Transformed */
    public Transformed: boolean = false;
    /** If this card has a banner with background for text, how many rows to cover and the color */
    public Bannerrows: number = 0;

    /** Destination for rebirth */
    public destination: number = 0;
       /** bribe */
    public bribe: number = 0;

    /** If this card is oversized */
    public oversized: boolean = false;

    /** A string prefix to place in front of this card's type */
    public typePrefix: string = "";

    /** The number of VP this card is worth at the end of the game */
    public victoryPoints: "*" | number = 1;

    /** How much this card costs to buy */
    public cost: number = 1;
    
    
    /** The text on the card. You can use [b] and [i] to bold and italic text */
    public text: string = "";

    /** The url to the image to use for this card */
    public imageURL: string = "";

    /** The url to the image to use for its upper right logo */
    public logoURL: string = "";

    /** A scalar to apply to the logo's size */
    public logoScale: number = 1;

    /** The copyright text, A © is automatically placed in front of this text */
    public copyright: string = String(new Date().getFullYear());

    /** The legal disclaimer on the bottom of the card */
    public legal: string = "";

    /** The sub type of the card next to the type */
    public subtype: string = "";

    /** The name of the set this card is a part of */
    public set: string = "";

    /** The color of the name of this card's set */
    public setTextColor = "#cccccc";

    /** The background color of the rounded box behind the set text */
    public setBackgroundColor = "#333333";

    /**
     * The preferred starting text size number to start at when auto sizing the
     * text. If the number is too large it will be ignored and down-scaled
     */
    public preferredTextSize: number = 0;

    /** A list of string to bold if they are encountered in the text */
    public alsoBold: string[] = [];

    /** If the corners of the card should be rounded */
    public roundCorners: boolean = true;

    /** The PIXI.Container this card's render is in */
    private container: PIXI.Container;


       /**
     * Creates a card from so key/value object
     * @param args optional args to call setFrom on
     */
    constructor(args?: {[key: string]: any}) {
        if (args) {
            this.setFrom(args);
        }
    }

    /**
     * Sets this card's internal variables from a key/value object
     * @param args the args to set; so to set imageURL, set args.imageURL
     */
    public setFrom(args: {[key: string]: any}): void {
        args = Object.assign({}, args);
        args.victoryPoints = args.victoryPoints || args.vp || args.VP || args.vP || 0;

        for (const key in args) {
            if (Object.prototype.hasOwnProperty.call(this, key)) {
                (this as any)[key] = args[key];
            }
        }

        // special cases, we can take "Super Hero/Villain" as a type
        // (which is invalid) and make it the oversized version
        if (this.type as any === "Super Hero") {
            this.type = "Hero";
            this.oversized = true;
        }
        else if (this.type as any === "Super Villain") {
            this.type = "Villain";
            this.oversized = true;
        }

        const isHeroOrVillain = this.type === "Hero" || this.type === "Villain"|| this.type === "Location";
        if (this.oversized && !isHeroOrVillain && this.type !== "Location") {
            this.oversized = false;
        }

        if (this.oversized && this.type === "Location") {
            this.pxWidth = LANDSCAPE_CARD_MAX_WIDTH;
            this.pxHeight = LANDSCAPE_CARD_MAX_HEIGHT;
        }
        else if (this.oversized) {
            this.pxWidth = CARD_MAX_WIDTH;
            this.pxHeight = CARD_MAX_HEIGHT;
        }
        else {
            this.pxWidth = 750;
            this.pxHeight = 1050;
        }
    }

    /**
     * Rendered the card asynchronously to a PIXI.Container
     * This method will load textures
     * @returns a promise that resolves to a rendered PIXI.Container with no
     *          parent
     */
    public render(): Promise<PIXI.Container> {
        return new Promise((resolve, reject) => {
            loadTextures([this.imageURL, this.logoURL], () => {
                this.renderSync();

                resolve(this.container);
            });
        });
    }


    /**
     * Renders a card synchronously, must be invoked after textures are already
     * loaded
     * @returns a PIXI.Container with no parent of the rendered card
     */
    public renderSync(): PIXI.Container {
        if (this.container) {
    this.container.removeChildren();
    this.container.destroy({ children: true });
}


        this.container = new PIXI.Container();

        this.renderImage();
        this.renderBackground();
        this.renderBanners();
        this.renderLogo();

        this.renderCost();
        this.renderSMCost();
        this.renderDestination();
        this.renderbribe();
        this.renderNL();
        this.renderVP();

        this.renderName();
        this.renderType();
        this.renderSubType();

        this.renderText();

        const copyright = this.renderCopyright();
        const set = this.renderSet(copyright);
        this.renderLegal(set, copyright);

        this.renderRoundedCorners();

        return this.container;
    }

    /**
     * A handy toString override that tells you this card's name
     * @returns card plus its name
     */
    public toString(): string {
        return `Card ${this.name}`;
    }

    /**
     * Formats the text, checking for keywords to bold or italic automatically
     * @returns the text now with bold and italic formatting tags inserted
     */
    private formatText(): string {
        let formattedText = this.text;

        formattedText = surroundText(formattedText, /\+(.*?)\ Power/g, "[b]", "[/b]");
        formattedText = surroundText(formattedText, /(\d)\ Power/g, "[b]", "[/b]");
        formattedText = surroundText(formattedText, /\(([^)]+)\)/g, "[i]", "[/i]");
        formattedText = surroundText(formattedText, /(Stack)\ Ongoing/g, "[b]", "[/b]");

        const boldKeywords = Card.autoBoldKeywords
            .concat([this.name])
            .concat(this.alsoBold);

        for (const toBold of boldKeywords) {
            formattedText = replaceAll(formattedText, toBold, `[b]${toBold}[/b]`);
        }

        return formattedText;
    }

    /**
     * Gets the PIXI.TextStyle for a part of the card
     * @param part the part of the card to get the style for
     * @returns the style for that part of the card, if found
     */
    private getStyle(part: string): PIXI.TextStyle {
        return getStyle(this.type, part, this.oversized);
    }

    /**
     * Renders the image part of the card
     */
    private renderImage(): void {
        if (!this.imageURL) {
            return;
        }

        let imageMaxWidth = 750;
        let imageMaxHeight = 523;
        let imageTop = 117;

        if (this.oversized && this.type === "Location") {
            imageMaxWidth = 1200;
            imageMaxHeight = 500;
            imageTop = 136;
        }
       else if (this.oversized) {
            imageMaxWidth = 900;
            imageMaxHeight = 741;
            imageTop = 216;
        }
        else if (this.type === "Crisis") {
            imageMaxWidth = 750;
            imageMaxHeight = 600;
            imageTop = 80;
        }


       const backgroundImage = newSprite(this.imageURL, this.container);
        backgroundImage.position.x = imageMaxWidth / 2;
        backgroundImage.position.y = imageTop + imageMaxHeight / 2;

        let backgroundBounds = backgroundImage.getBounds();
        const scale = Math.max(
            imageMaxWidth / backgroundBounds.width,
            imageMaxHeight / backgroundBounds.height,
        );

        backgroundBounds = backgroundImage.getLocalBounds();

        backgroundImage.scale.set(scale, scale);
        backgroundImage.pivot.x = backgroundBounds.width / 2;
        backgroundImage.pivot.y = backgroundBounds.height / 2;

        const backgroundImageMask = new PIXI.Graphics();
        backgroundImageMask.beginFill(0);
        backgroundImageMask.drawRect(0, imageTop,
                                     imageMaxWidth, imageMaxHeight);
        backgroundImageMask.endFill();

        this.container.addChild(backgroundImageMask);
        backgroundImage.mask = backgroundImageMask;
    }

    /**
     * Renders the background part of the card based on the card's type
     */
    private renderBackground(): void {
        if (!this.type) {
            return;
        }
        else if (this.variant && this.oversized && this.type==="Hero") {
            newSprite("oversizedcrisishero", this.container)
        }
        else if(this.variant && this.oversized && this.type==="Villain") {
            newSprite("oversizedcrisisvillain", this.container)
        }
        else if (this.type === "Location" && this.oversized) {
             newSprite("oversizedlocation", this.container)
            }
        else {
        let backgroundType: string = this.type;
        
        if(this.type === "Hero" || this.type === "Equipment" || this.type === "Villain"  || this.type === "Starter"){
            if(this.Transformed){backgroundType = `${this.type}transformed`;}
        }
        
        if (this.variant || this.oversized) {
            if (this.type === "Hero" || this.type === "Villain") {
                backgroundType = `Super-${this.type}`;
            }
        }
        if (this.oversized) {
            backgroundType = `Oversized-${backgroundType}`;
        }
        
        
        
        newSprite(backgroundType.replace(" ", "-").toLowerCase(), this.container);


        // in the below block !this.Transformed doesn't seem to be working
        if (this.variant && !this.oversized && !this.Transformed) {
            // draw a black box behind the text
            const graphics = new PIXI.Graphics();
            graphics.beginFill(0x000000); // black
            graphics.drawRect(0, 719, 750, 224);
            graphics.endFill();
            this.container.addChild(graphics);
        }
         }

        if (this.variant && this.oversized && this.type==="Location") {
            // draw a black box behind the text for oversized Location variant
            const graphics = new PIXI.Graphics();
            graphics.beginFill(0x000000); // black
            graphics.drawRect(0, 689, 1200, 120);
            graphics.endFill();
            this.container.addChild(graphics);
        }
    }
        private renderBanners(): void {
        if (!this.type) {
            return;
        }
      //  const banners = String(this.Bannerrows);        
        ///// Banners
         if (this.Bannerrows === 2 && !this.oversized) {
         // draw a blue box behind the text
            const graphics = new PIXI.Graphics();
            graphics.beginFill(0x00BAF1); // blue
            graphics.drawRect(0, 719, 750, 92);
            graphics.endFill();
            this.container.addChild(graphics);
        }
        else if (this.Bannerrows === 1 && !this.oversized) {
         // draw a blue box behind the text
            const graphics = new PIXI.Graphics();
            graphics.beginFill(0x00BAF1); // blue
            graphics.drawRect(0, 719, 750, 54);
            graphics.endFill();
            this.container.addChild(graphics);}
    
        else if (this.Bannerrows === 3 && !this.oversized) {
         // draw a blue box behind the text
            const graphics = new PIXI.Graphics();
            graphics.beginFill(0x00BAF1); // blue
            graphics.drawRect(0, 719, 750, 130);
            graphics.endFill();
            this.container.addChild(graphics);}
    
        else if (this.Bannerrows === -1 && !this.oversized) {
         // draw a green box behind the text
            const graphics = new PIXI.Graphics();
            graphics.beginFill(0x7CC141); // green
            graphics.drawRect(0, 719, 750, 54);
            graphics.endFill();
            this.container.addChild(graphics);}
    
        else if (this.Bannerrows === -2 && !this.oversized) {
         // draw a green box behind the text
            const graphics = new PIXI.Graphics();
            graphics.beginFill(0x7CC141); // green
            graphics.drawRect(0, 719, 750, 92);
            graphics.endFill();
            this.container.addChild(graphics);}
    
        else if (this.Bannerrows === 4 && !this.oversized) {
         // draw a blue box behind the text
            const graphics = new PIXI.Graphics();
            graphics.beginFill(0xF5B345); // gold
            graphics.drawRect(0, 719, 750, 54); // 1 row
            graphics.endFill();
            this.container.addChild(graphics);}
    
    else if (this.Bannerrows === 5 && !this.oversized) {
         // draw a gold box behind the text
            const graphics = new PIXI.Graphics();
            graphics.beginFill(0xF5B345); // gold
            graphics.drawRect(0, 719, 750, 92); // 2 rows
            graphics.endFill();
            this.container.addChild(graphics);}

            else if (this.Bannerrows === 6 && !this.oversized) {
         // draw a blue box behind the text
            const graphics = new PIXI.Graphics();
            graphics.beginFill(0xF5B345); // gold
            graphics.drawRect(0, 719, 750, 130); // 3 rows
            graphics.endFill();
            this.container.addChild(graphics);}
    
    else if (this.Bannerrows === 7 && !this.oversized) {
         // draw a blue box behind the text
            const graphics = new PIXI.Graphics();
            graphics.beginFill(0x7A1316); // red for Stack Ongoing:
            graphics.drawRect(0, 719, 750, 54);
            graphics.endFill();
            this.container.addChild(graphics);}

            
    else if (this.Bannerrows === 8 && !this.oversized) {
         // draw a blue box behind the text
            const graphics = new PIXI.Graphics();
            graphics.beginFill(0x7A1316); // red for Stack Ongoing:
            graphics.drawRect(0, 719, 750, 92);
            graphics.endFill();
            this.container.addChild(graphics);}
    
    else if (this.Bannerrows === 9 && !this.oversized) {
         // draw a blue box behind the text
            const graphics = new PIXI.Graphics();
            graphics.beginFill(0x7A1316); // red for Stack Ongoing:
            graphics.drawRect(0, 719, 750, 130);
            graphics.endFill();
            this.container.addChild(graphics);}

    else if (this.Bannerrows === 10 && !this.oversized) {
         // draw a blue box behind the text
            const graphics = new PIXI.Graphics();
            graphics.beginFill(0xF7EB00); // Yellow
            graphics.drawRect(0, 719, 750, 54);
            graphics.endFill();
            this.container.addChild(graphics);}
    
    else if (this.Bannerrows === 10 && this.oversized) {
         // draw a blue box behind the text
            const graphics = new PIXI.Graphics();
            graphics.beginFill(0xF7EB00); // Yellow for oversized
            graphics.drawRect(0, 966, 900, 54);
            graphics.endFill();
            this.container.addChild(graphics);}
    
    else if (this.Bannerrows === 11 && !this.oversized) {
         // draw a blue box behind the text
            const graphics = new PIXI.Graphics();
            graphics.beginFill(0xE6118B); // Pink
            graphics.drawRect(0, 719, 750, 54);
            graphics.endFill();
            this.container.addChild(graphics);}
    
    else if (this.Bannerrows === 12 && !this.oversized) {
         // draw a blue box behind the text
            const graphics = new PIXI.Graphics();
            graphics.beginFill(0x77CEDA); // Light blue
            graphics.drawRect(0, 719, 750, 54);
            graphics.endFill();
            this.container.addChild(graphics);}
    else if (this.Bannerrows === 13 && !this.oversized) {
         // draw a blue box behind the text
            const graphics = new PIXI.Graphics();
            graphics.beginFill(0x8454A1); // Purple from Hush
            graphics.drawRect(0, 719, 750, 54);
            graphics.endFill();
            this.container.addChild(graphics);}
            ;
    
    }


    /**
     * Renders the logo part of the card
     */
    private renderLogo(): void {
        if (!this.logoURL) {
            return;
        }

        const maxLogoWidth = 175;
        const maxLogoHeight = 175;
        const logoSprite = newSprite(this.logoURL, this.container);
        let bounds = logoSprite.getBounds();

        let scale = 1;
        if (bounds.width > maxLogoWidth) {
            scale = Math.min(scale, maxLogoWidth / bounds.width);
        }
        if (bounds.height > maxLogoHeight) {
            scale = Math.min(scale, maxLogoHeight / bounds.height);
        }

        if (this.logoScale) {
            scale *= this.logoScale;
        }

        let x = 714;
        let y = 26;
        if (this.oversized && this.type === "Location") {
            x = LANDSCAPE_CARD_MAX_WIDTH - 40;
            y = 25;
        }
        else if (this.oversized) {
            x = CARD_MAX_WIDTH - 40;
            y = 25;
        }
        

        bounds = logoSprite.getLocalBounds();
        logoSprite.scale.set(scale, scale);
        logoSprite.pivot.x = bounds.width;
        logoSprite.position.set(x, y);
    }


    /**
     * Renders the name part of the card
     */
    private renderName(): void {
        let x = 45;
        let y = 48;
        if (this.oversized) {
            x = 53;
            y = 55;
        }

        const cardName = new PIXI.Text(
            this.name.toUpperCase(),
            this.getStyle("name"),
                );
        let maxWidth = 590; //target maximum size for autosize

    if (this.oversized && this.type==="Location"){
         cardName.style.fill = "#8dc73f";
         maxWidth = 1000; // target maximum size for autosize for landscape location cards
            }
    if (this.oversized && this.type!=="Location"){
         maxWidth = 690; // target maximum size for autosize for Oversized cards
            }

    cardName.updateText();

if (cardName.width > maxWidth) {
    const scale = maxWidth / cardName.width;
    // Directly change the font size for sharp text rendering
    cardName.style.fontSize = Math.floor(cardName.style.fontSize * scale);
}

        cardName.position.set(x, y);
        cardName.scale.y *= 0.75;
        cardName.scale.x *= 0.96;
        cardName.skew.x = -0.265;
        this.container.addChild(cardName);
    }


    /**
     * Renders the type part of the card (text, not background)
     */
  private renderType(): void {
        if (this.oversized || this.type === "Weakness"|| this.type === "Hostage"|| this.type === "Crisis"|| this.type === "Basic"|| this.type === "Typeless" || this.Transformed) {
            return;
        }

        if(this.subtype === "SIDE MISSION"){
        const cardTypeText = new PIXI.Text("SIDE MISSION", this.getStyle("type"));
  
        cardTypeText.x = 45;
        cardTypeText.y = 666;

        cardTypeText.scale.y *= 0.75;
        cardTypeText.scale.x *= 0.96;
        cardTypeText.skew.x = -0.265;
        this.container.addChild(cardTypeText);
        }
else{
        let text = this.type.toUpperCase();
        if (this.typePrefix) {
            text = `${this.typePrefix} ${text}`;
        }
        const cardTypeText = new PIXI.Text(text, this.getStyle("type"));
 
        cardTypeText.x = 45;
        cardTypeText.y = 666;

        cardTypeText.scale.y *= 0.75;
        cardTypeText.scale.x *= 0.96;
        cardTypeText.skew.x = -0.265;
        this.container.addChild(cardTypeText);
    }
    }

    /**
     * Renders the sub type text part of the card
     */
     private renderSubType(): void {
        if (!this.subtype || this.subtype === "SIDE MISSION") {
            return;
        }
    if(this.subtype === "CONSTRUCT"){
         newSprite("construct", this.container);
    } 
    else if(this.subtype === "METAL" && this.variant === false){
     newSprite("backgroundmetal", this.container);
    }
    else if(this.subtype === "CURSED" && this.variant === true && this.type === "Weakness"){
     newSprite("backgroundcursed", this.container);
    }
  //Conditional VP is setup in VP section, this line just prevents the subtype from showing.
    else if(this.subtype === "CONDITIONAL VP" || this.subtype === "SIDE MISSION"){
        return;
    }

    else{   let x = 710;
        let y = 700;
        if (this.oversized) {
            x = 900 - 39;
            y = 950;
        }

        const subtypeText = new PIXI.Text(
            this.subtype.toUpperCase(),
            this.getStyle("subtype"),
        );

        subtypeText.scale.y *= 0.75;
        subtypeText.scale.x *= 0.96;
        if(this.type === "Super Move"){
        subtypeText.skew.x = 0; } else{
        subtypeText.skew.x = -0.265;}
        subtypeText.pivot.set(subtypeText.width, subtypeText.height);
        subtypeText.position.set(x, y);
        this.container.addChild(subtypeText);
    }}


    /**
     * Renders the cost part of the card
     */
     private renderCost(): void {
        if (this.oversized || this.type === "Super Move" || this.type === "Crisis" || this.subtype === "SIDE MISSION") {
            return;
        }

        newSprite("background-cost", this.container);
        if(this.ConditionalCost === true) 
                    {// card's cost back
                        const cardCostBackStyle = this.getStyle("cost");
                        const cardCostBackText = new PIXI.Text(
                            String(this.cost+"*"),
                            cardCostBackStyle,
                        );
                        cardCostBackText.pivot.x = cardCostBackText.width / 2;
                        cardCostBackText.pivot.y = cardCostBackText.height / 2;
                        cardCostBackText.position.set(650, 958);
                        this.container.addChild(cardCostBackText);

                        // and front (so we can basically have a double stroke)
                        const cardCostFrontStyle = cardCostBackStyle.clone();
                        cardCostFrontStyle.stroke = "#ffffff";
                        cardCostFrontStyle.strokeThickness = 10;
                        const cardCostFrontText = new PIXI.Text(
                            String(this.cost+"*"),
                            cardCostFrontStyle,
                        );

                        cardCostFrontText.pivot.x = cardCostFrontText.width / 2;
                        cardCostFrontText.pivot.y = cardCostFrontText.height / 2;
                        cardCostFrontText.position.set(650, 958);
                        this.container.addChild(cardCostFrontText);}

else{
            
        // card's cost back
        const cardCostBackStyle = this.getStyle("cost");
        const cardCostBackText = new PIXI.Text(
            String(this.cost),
            cardCostBackStyle,
        );
        cardCostBackText.pivot.x = cardCostBackText.width / 2;
        cardCostBackText.pivot.y = cardCostBackText.height / 2;
        cardCostBackText.position.set(641, 958);
        this.container.addChild(cardCostBackText);

        // and front (so we can basically have a double stroke)
        const cardCostFrontStyle = cardCostBackStyle.clone();
        cardCostFrontStyle.stroke = "#ffffff";
        cardCostFrontStyle.strokeThickness = 10;
        const cardCostFrontText = new PIXI.Text(
            String(this.cost),
            cardCostFrontStyle,
        );

        cardCostFrontText.pivot.x = cardCostFrontText.width / 2;
        cardCostFrontText.pivot.y = cardCostFrontText.height / 2;
        cardCostFrontText.position.set(641, 958);
        this.container.addChild(cardCostFrontText);}
    }

// For Super Moves, renders cost with special background, 

   private renderSMCost(): void {
        if (this.oversized || this.type != "Super Move") {
            return;
        }
         if (this.cost <= 0 || this.cost >= 9 ) {
            return;
        }
        newSprite("backgroundsupermove"+this.cost, this.container);
        

        const cardCostBackStyle = this.getStyle("cost");
        const cardCostBackText = new PIXI.Text(
            String(this.cost),
            cardCostBackStyle,
        );
        cardCostBackText.pivot.x = cardCostBackText.width / 2;
        cardCostBackText.pivot.y = cardCostBackText.height / 2;
        cardCostBackText.position.set(645, 958);
        this.container.addChild(cardCostBackText);

        // and front (so we can basically have a double stroke)
        const cardCostFrontStyle = cardCostBackStyle.clone();
        cardCostFrontStyle.stroke = "#ffffff";
        cardCostFrontStyle.strokeThickness = 10;
        const cardCostFrontText = new PIXI.Text(
            String(this.cost),
            cardCostFrontStyle,
        );

        cardCostFrontText.pivot.x = cardCostFrontText.width / 2;
        cardCostFrontText.pivot.y = cardCostFrontText.height / 2;
        cardCostFrontText.position.set(645, 958);
        this.container.addChild(cardCostFrontText);

    }

    
// render destination
private renderDestination(): void {
        if (this.oversized || this.type !== "Villain" || this.destination == 0 ) {
            return;
        }

        newSprite("destination", this.container);

        // destination text
        const cardCostFrontStyle = this.getStyle("destination");
        cardCostFrontStyle.stroke = "#000000";
        cardCostFrontStyle.strokeThickness = 10;
        const cardCostFrontText = new PIXI.Text(
            String(this.destination),
            cardCostFrontStyle,
        );

        cardCostFrontText.pivot.x = cardCostFrontText.width / 2;
        cardCostFrontText.pivot.y = cardCostFrontText.height / 2;
        cardCostFrontText.position.set(645, 585);
        this.container.addChild(cardCostFrontText);
    }
// render bribe
private renderbribe(): void {
        if (this.oversized|| this.bribe == 0) {
            return;
        }
newSprite("backgroundbribe", this.container);

 // bribe text
        const cardCostFrontStyle = this.getStyle("bribe");
        const cardCostFrontText = new PIXI.Text(
            String(this.bribe),
            cardCostFrontStyle,
        );
cardCostFrontText.pivot.x = cardCostFrontText.width / 2;
        cardCostFrontText.pivot.y = cardCostFrontText.height / 2;
        cardCostFrontText.position.set(400, 730);
        this.container.addChild(cardCostFrontText)
    }

    // render NL Nemesis Level
   private renderNL(): void {
        if (this.oversized || this.cost < "8" || !this.variant) {
            return;
        };
        
        if (this.cost == "8") {
         this.nlu = "1";
        } else if (this.cost == "9" || this.cost == "10") {
         this.nlu = "2";
        } else if (this.cost == "11" || this.cost == "12") {
         this.nlu = "3";
        }else {
            this.nlu = "4";

        }
        
        if (this.type == "Villain"){
        newSprite("backgroundsvlevel", this.container);
       // backgroundshlevel text
        const NLStyle = this.getStyle("backgroundsvlevel");
        const cardCostFrontText = new PIXI.Text(
            String("LEVEL " + this.nlu),
            NLStyle,
        );

        cardCostFrontText.pivot.x = cardCostFrontText.width / 2;
        cardCostFrontText.pivot.y = cardCostFrontText.height / 2;
        cardCostFrontText.skew.x = -0.180;
        cardCostFrontText.position.set(510, 722);
        this.container.addChild(cardCostFrontText);
    }
 else if (this.type == "Hero"){
        newSprite("backgroundshlevel", this.container);
       // backgroundshlevel text
        const NLStyle = this.getStyle("backgroundsvlevel");
        const cardCostFrontText = new PIXI.Text(
            String("LEVEL " + this.nlu),
            NLStyle,
        );
        cardCostFrontText.pivot.x = cardCostFrontText.width / 2;
        cardCostFrontText.pivot.y = cardCostFrontText.height / 2;
        cardCostFrontText.skew.x = -0.180;
        cardCostFrontText.position.set(535, 718);
        this.container.addChild(cardCostFrontText);
    }
}


    /**
     * Renders the victory points part of the card
     */
    private renderVP(): void {
        if (this.oversized || this.type === "Super Move" || this.type === "Crisis" || this.subtype === "SIDE MISSION") {
            return;
        }

        const vpSign = this.victoryPoints < 0 ? "negative" : "normal";
        newSprite(`background-vp-${vpSign}`, this.container);

        if (this.victoryPoints === "*") {
            newSprite("vp-variable", this.container);
        }
else if(this.ConditionalVP){
     newSprite("vp-variable", this.container);
    }

        else { // it's a number
            const scalar = 2;
            const vpStyle = this.getStyle("vp");

            if (this.victoryPoints < 0) {
                vpStyle.stroke = "#9dcd4e"; // green outline for negative VPs
            }

            vpStyle.fontSize = Number(vpStyle.fontSize) * scalar;
            vpStyle.strokeThickness = Number(vpStyle.strokeThickness) * scalar;

            const vps = String(Math.abs(this.victoryPoints));
            const vpText = new PIXI.Text(vps, vpStyle);
            vpText.scale.y *= 0.75 / scalar;
            vpText.scale.x *= 1 / scalar;

            const bounds = vpText.getLocalBounds();
            vpText.pivot.set(bounds.width / 2, bounds.height / 2);
            vpText.position.set(88, 982);
            this.container.addChild(vpText);
        }
    }


    /**
     * Renders the text part of the card
     */
    private renderText(): void {
        let formattedText = this.formatText();

        formattedText = replaceAll(formattedText, "[b]", wrapStyledTextCharacters.boldStart);
        formattedText = replaceAll(formattedText, "[/b]", wrapStyledTextCharacters.boldEnd);
        formattedText = replaceAll(formattedText, "[i]", wrapStyledTextCharacters.italicStart);
        formattedText = replaceAll(formattedText, "[/i]", wrapStyledTextCharacters.italicEnd);

        const vpCircle = new PIXI.Circle(603, 215, 78 + 5);
        const collisions = [];
        let maxWidth = 750;
        let maxHeight = 172;
        const x = 39;
        let y = 731;
        if (this.oversized) {
            y = 974;
            maxWidth = 900;
            maxHeight = 161 - 14 * 2;
        }
        else {
            collisions.push(vpCircle);
        }
        if (this.oversized && this.type === "Location") {
            y = 695;
            maxWidth = 1100;
            maxHeight = 120 - 14 * 2;
        }
        const style = this.getStyle("text");
        if (this.variant && !this.oversized) {
            style.fill = "#ffffff";
        }
        if (this.Transformed) {
            style.fill = "#ffffff";
        }
        if (!this.variant && this.oversized && this.type === "Location") {
            style.fill = "#000000";
        }
        if (this.preferredTextSize > 0) {
            style.fontSize = this.preferredTextSize;
        }

        const textContainer = autoSizeAndWrapStyledText(
            formattedText,
            maxWidth - x * 2,
            maxHeight, style,
            1,
            collisions,
            this.oversized,
            this.oversized,
        );

        textContainer.position.set(x, y);
        this.container.addChild(textContainer);
    }


    /**
     * Renders the set part of the card
     * @param copyright the rendered copyright element to position from
     * @returns the rendered set element for future renders to position off
     */
    private renderSet(copyright: PIXI.Container): PIXI.Container {
        if (!this.set) {
            return;
        }

        const style = this.getStyle("set");
        style.fill = this.setTextColor || "#ffffff";
        const set = new PIXI.Text(this.set.toUpperCase(), style);
        set.scale.y *= 0.75;
        set.pivot.set(set.width, set.height);

        if (this.oversized && this.type === "Location") {
            set.position.x = copyright.x - copyright.width - 16;
            set.position.y = 865 - set.height;
        }
        else if (this.oversized) {
            // note these and other numbers were found via pixel coordinates
            // on the photo shop template
            set.position.x = copyright.x - copyright.width - 16;
            set.position.y = 1171 - set.height;
        }
        else {
            set.position.set(550, 934);
        }

        // now draw the background
        const xPad = 4;
        const topPad = 3;
        const bottomPad = 4;
        const backgroundColor = (this.setBackgroundColor || "#000000");
        const graphics = new PIXI.Graphics();
        graphics.beginFill(parseInt(backgroundColor.replace(/^#/, ""), 16));
        graphics.drawRoundedRect(
            set.x - set.width - xPad,
            set.y - set.height - topPad,
            set.width + xPad * 2,
            set.height + bottomPad * 2,
            8, // border radius
        );
        graphics.endFill();

        this.container.addChild(graphics);
        this.container.addChild(set);

        return set;
    }

    /**
     * Renders the copyright part of the card
     * @returns the copyright pixi object rendered
     */
    private renderCopyright(): PIXI.Container {
        let maxWidth = 150;
        let x = 450;
        let y = 980;
        if (this.oversized && this.type === "Location") {
            maxWidth = 182;
            x = 1200 - 37;
            y = 830;
        }
        
        else if (this.oversized) {
            maxWidth = 182;
            x = 900 - 37;
            y = 1136;
        }
        

        const style = this.getStyle("copyright");

        const copyright = wrapStyledText(`©${this.copyright}`, maxWidth, style);

        if (this.oversized) {
            copyright.pivot.x = copyright.width;
        }
        else {
            copyright.pivot.y = copyright.height;
        }

        copyright.position.set(x, y);
        this.container.addChild(copyright);
        return copyright;
    }

    /**
     * Renders the legal part of the card
     * @param set the already rendered set to position off
     * @param copyright the already rendered copyright to position off
     */
    private renderLegal(set: PIXI.Container, copyright: PIXI.Container): void {
        let maxWidth = 280;
        let x = 150;
        let y = 954;
        const style = this.getStyle("legal");
        let legal: PIXI.Container;

       if (this.oversized) {
            maxWidth = 824;
            x = 37;
            y = 1136;

            if (set) {
                maxWidth -= set.width + 16;
            }
            if (copyright) {
                maxWidth -= copyright.width + 16;
            }

            legal = autoSizeAndWrapStyledText(
                this.legal,
                maxWidth,
                Number(style.fontSize) * 2,
                style,
                0.25,
            );
        }
        if(this.oversized && this.type === "Location") {
            maxWidth = 824;
            x = 37;
            y = 830;
        }
        else {
            // no need to auto size on none oversized cards
            legal = wrapStyledText(
                this.legal,
                maxWidth,
                this.getStyle("legal"),
            );
        }

        if (legal) {
            legal.position.set(x, y);
            this.container.addChild(legal);
        }
    }



    /**
     * Renders the rounded corners part of the card
     */
    private renderRoundedCorners(): void {
        if (!this.roundCorners) {
            return;
        }

        const borderRadius = this.oversized
            ? 45
            : 37;

        const bleedMask = new PIXI.Graphics();
        bleedMask.beginFill(0, 1);
        bleedMask.drawRoundedRect(
            0,
            0,
            this.pxWidth,
            this.pxHeight,
            borderRadius,
        );
        bleedMask.endFill();
        this.container.addChild(bleedMask);
        this.container.mask = bleedMask;
    }
}
