/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    reportSliceId: ComponentFramework.PropertyTypes.StringProperty;
    publisherPrefix: ComponentFramework.PropertyTypes.StringProperty;
    subGridHeight: ComponentFramework.PropertyTypes.WholeNumberProperty;
    viewportHeight: ComponentFramework.PropertyTypes.WholeNumberProperty;
    containerHeight: ComponentFramework.PropertyTypes.StringProperty;
    enableImageFunctionality: ComponentFramework.PropertyTypes.TwoOptionsProperty;
    enableBulkUpload: ComponentFramework.PropertyTypes.TwoOptionsProperty;
    reportDataSet: ComponentFramework.PropertyTypes.DataSet;
}
export interface IOutputs {
}
