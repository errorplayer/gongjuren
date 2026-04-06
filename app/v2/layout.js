import './globals-v2.css';

export const metadata = {
  title: '520Tool - 免费在线工具箱',
  description: '精选好用的免费在线工具',
};

export default function V2Layout({ children }) {
  return (
    <div className="v2-root">
      {children}
    </div>
  );
}
