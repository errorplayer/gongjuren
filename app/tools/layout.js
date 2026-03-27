import AdSlot from '../_components/AdSlot';

export default function ToolsLayout({ children }) {
  return (
    <div className="container">
      {/* <AdSlot position="top" /> */}
      {children}
      {/* <AdSlot position="bottom" /> */}
    </div>
  );
}
