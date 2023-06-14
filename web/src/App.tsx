import './styles/default.scss';
import './App.css';
import Landscape from './layout/landscape';

const App = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (window as any).baseDS;

  if (data === null || data === undefined) return null;

  return (
    <div>
      <div className="fs-3 p-4 text-center">CNCF Cloud Native Interactive Landscape</div>
      <Landscape data={data} />
    </div>
  );
};

export default App;
