import { Component, PropsWithChildren, ReactNode } from 'react'
import '@grapecity/spread-sheets-designer-resources-cn';
import "@grapecity/spread-sheets/styles/gc.spread.sheets.excel2013white.css"
import '@grapecity/spread-sheets-designer/styles/gc.spread.sheets.designer.min.css'
import "@grapecity/spread-sheets-tablesheet";
import "@grapecity/spread-sheets-barcode";
import "@grapecity/spread-sheets-charts";
import "@grapecity/spread-sheets-shapes";
import "@grapecity/spread-sheets-languagepackages";
import "@grapecity/spread-sheets-print";
import "@grapecity/spread-sheets-pdf";
import "@grapecity/spread-sheets-pivot-addon";
import "@grapecity/spread-sheets-resources-zh";
import "@grapecity/spread-sheets-designer-resources-cn";
// import * as GCDesigner from '@grapecity/spread-sheets-designer';
import "@grapecity/spread-sheets-resources-zh"
import GC from "@grapecity/spread-sheets"
import {Designer}  from '@grapecity/spread-sheets-designer-react';
// Set Chinese culture
GC.Spread.Common.CultureManager.culture('zh-cn');

export interface SpreadDesignerProps {
  onWorkbookReady?: (workbook: GC.Spread.Sheets.Workbook, designer: any) => void;
  styleInfo?: React.CSSProperties;
}

export class SpreadDesigner extends Component<SpreadDesignerProps> {
  designer: any = null;

  designerInitialized = (designer: any) => {
    this.designer = designer;
    const workbook = designer.getWorkbook();
    console.log('Designer initialized:', workbook);

    if (this.props.onWorkbookReady) {
      this.props.onWorkbookReady(workbook, designer);
    }
  };

  render() {
    const style = this.props.styleInfo || { height: '100vh', width: '100%' };
    return (
      <Designer
        spreadOptions={{ sheetCount: 1 }}
        styleInfo={style as any}
        designerInitialized={this.designerInitialized}
      />
    );
  }
}
