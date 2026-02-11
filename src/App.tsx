import GC from '@grapecity/spread-sheets';
import { SmartReportDesigner } from './components/SmartReportDesigner';
import { SmartComponent } from './types/SmartComponent';
import './App.css';

// Set license key if available
// setLicenseKey('your-license-key');

function App() {
  // Load saved components from localStorage
  const savedComponents = localStorage.getItem('smartreport_components');
  const initialComponents: SmartComponent[] = savedComponents ? JSON.parse(savedComponents) : [];

  const handleComponentsChange = (components: SmartComponent[]) => {
    // Auto save to localStorage
    localStorage.setItem('smartreport_components', JSON.stringify(components));
  };

  const handleSpreadReady = (workbook: GC.Spread.Sheets.Workbook, designer: any) => {
    console.log('[App] SpreadJS ready:', workbook, designer);
  };

  return (
    <SmartReportDesigner
      initialComponents={initialComponents}
      onComponentsChange={handleComponentsChange}
      onSpreadReady={handleSpreadReady}
    />
  );
}

export default App;
