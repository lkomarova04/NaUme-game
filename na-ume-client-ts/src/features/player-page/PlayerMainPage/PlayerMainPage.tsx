import './PlayerMainPage.css';

type PlayerMainPageProps = {
    onStart: () => void;
}

const PlayerMainPage = ({ onStart }: PlayerMainPageProps) => {
    return (
        <div className="main-page">
            <div className="header-logo">
                <img src="./logo.png" alt="logo" />
            </div>
            <div className="main-page__body">
                <div className="input-wrapper">
                    <img src="./people.png" className="input-icon" />
                    <input
                        className="main-page__input"
                        placeholder="Ваш ник"
                    />
                </div>
                <button className="main-page__btn"
                onClick={onStart}
                >
                    Начнем
                </button>
            </div>
        </div>
    );
};

export default PlayerMainPage;