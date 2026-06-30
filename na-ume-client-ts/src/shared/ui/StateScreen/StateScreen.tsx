import type { ReactNode } from 'react';

import './StateScreen.css';

type StateScreenProps = {
  eyebrow: string;
  title: string;
  description: string;
  detail?: string;
  actions?: ReactNode;
};

export const StateScreen = ({ eyebrow, title, description, detail, actions }: StateScreenProps) => {
  return (
    <main className="state-screen">
      <section className="state-screen__panel">
        <p className="state-screen__eyebrow">{eyebrow}</p>
        <h1 className="state-screen__title">{title}</h1>
        <p className="state-screen__description">{description}</p>
        {detail ? <p className="state-screen__detail">{detail}</p> : null}
        {actions ? <div className="state-screen__actions">{actions}</div> : null}
      </section>
    </main>
  );
};
