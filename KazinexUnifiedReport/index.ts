import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { UnifiedGridContainer } from "./components/UnifiedGridContainer";

export class UnifiedReport implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container: HTMLDivElement;
    private _notifyOutputChanged: () => void;
    private _context: ComponentFramework.Context<IInputs>;

    /**
     * Empty constructor.
     */
    constructor() {
        // Empty
    }

    /**
     * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
     * Data-set values are not initialized here, use updateView.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
     * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
     * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
     * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
     */
    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        // Store references for later use
        this._container = container;
        this._notifyOutputChanged = notifyOutputChanged;
        this._context = context;

        // Enable container resize tracking for dynamic height adjustment
        // When allocatedHeight = -1, component should fill 100% of available space
        context.mode.trackContainerResize(true);

        // // console.log(...)
    }


    /**
     * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
     */
    public updateView(context: ComponentFramework.Context<IInputs>): void {
        // Update context reference
        this._context = context;

        // Render using React 17 API
        // Day 3: Now using UnifiedGridContainer with DataverseService
        // // console.log(...)
        
        // Get container dimensions with smart height handling
        const allocatedWidth = context.mode.allocatedWidth;
        const allocatedHeight = context.mode.allocatedHeight;
        
        // Get custom viewport height from manifest (default 800)
        const customViewportHeight = context.parameters.viewportHeight?.raw ?? 800;

        // Height logic:
        // - If allocatedHeight = -1: No limit, use 100% (set very large value for flex layout)
        // - If allocatedHeight > 0: Container has specific height, use it
        // - Otherwise: Use custom viewport height from manifest
        let finalHeight: number;
        if (allocatedHeight === -1) {
            // No height limit - component should expand to fill available space
            // Use CSS approach by setting parent container to 100%
            this._container.style.height = '100%';
            this._container.style.display = 'flex';
            this._container.style.flexDirection = 'column';
            finalHeight = customViewportHeight; // Fallback for React component
        } else if (allocatedHeight > 0) {
            // Specific height allocated by container
            this._container.style.height = `${allocatedHeight}px`;
            finalHeight = allocatedHeight;
        } else {
            // Use custom viewport height from manifest
            this._container.style.height = `${customViewportHeight}px`;
            finalHeight = customViewportHeight;
        }

        // // console.log(...)

        // Get container height from manifest (default 60vh)
        const containerHeight = context.parameters.containerHeight?.raw ?? '60vh';

        // Render component using React 17 API
        ReactDOM.render(
            React.createElement(UnifiedGridContainer, {
                context: this._context,
                width: allocatedWidth > 0 ? allocatedWidth : 1200,
                height: finalHeight,
                containerHeight: containerHeight
            }),
            this._container
        );

        // // console.log(...)
    }

    /**
     * It is called by the framework prior to a control receiving new data.
     * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as "bound" or "output"
     */
    public getOutputs(): IOutputs {
        return {};
    }

    /**
     * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
     * i.e. cancelling any pending remote calls, removing listeners, etc.
     */
    public destroy(): void {
        // Cleanup React root following PCF best practices
        // Cleanup React component using React 17 API
        ReactDOM.unmountComponentAtNode(this._container);
        // // console.log(...)
    }
}

