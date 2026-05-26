import './PlayerMainPage.css';
import logo from './logo.png'
import icon from './people.png'

type PlayerMainPageProps = {
  value: string;
  onChange: (value: string) => void;
  sessionCode?: string;
  onSessionCodeChange?: (value: string) => void;
  showSessionCode?: boolean;
  onStart: () => void;
  joined?: boolean;
  status?: string | null;
};

const PlayerMainPage = ({
  value,
  onChange,
  sessionCode = '',
  onSessionCodeChange,
  showSessionCode = false,
  onStart,
  joined = false,
  status,
}: PlayerMainPageProps) => {
  return (
    <div className="main-page">
      <div className="header-logo">
        <img src={logo} alt="logo" />
      </div>
      <div className="main-page__body">
        {showSessionCode && (
          <div className="input-wrapper main-page__session-input">
            <input
              className="main-page__input main-page__input--center"
              placeholder="Номер сессии"
              value={sessionCode}
              onChange={(event) => onSessionCodeChange?.(event.target.value)}
            />
          </div>
        )}
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
        {status ? <p className="main-page__status">{status}</p> : null}
      </div>
    </div>
  );
};

export default PlayerMainPage;
