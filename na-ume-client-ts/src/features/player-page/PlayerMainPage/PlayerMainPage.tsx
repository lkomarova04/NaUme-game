import './PlayerMainPage.css';
import logo from './logo.png'
import icon from './people.png'

type PlayerMainPageProps = {
  value: string;
  onChange: (value: string) => void;
  onStart: () => void;
  joined?: boolean;
};

const PlayerMainPage = ({ value, onChange, onStart, joined = false }: PlayerMainPageProps) => {
  return (
    <div className="main-page">
      <div className="header-logo">
        <img src={logo} alt="logo" />
      </div>
      <div className="main-page__body">
        <div className="input-wrapper">
          <img src={icon} className="input-icon" alt="player" />
          <input
            className="main-page__input"
            placeholder="Ваш ник"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
        <button className="main-page__btn" onClick={onStart}>
          {joined ? 'Подключено' : 'Начнем'}
        </button>
      </div>
    </div>
  );
};

export default PlayerMainPage;
