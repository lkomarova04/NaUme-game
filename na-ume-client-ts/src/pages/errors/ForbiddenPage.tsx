import { Link } from 'react-router-dom';

import { StateScreen } from '@/shared/ui/StateScreen/StateScreen';

const ForbiddenPage = () => {
  return (
    <StateScreen
      eyebrow="403"
      title="Доступ закрыт"
      description="Похоже, для этой страницы нужен код организатора. Проверьте доступ или вернитесь в главное меню."
      detail="Если это ваш экран администратора, попробуйте заново ввести код доступа."
      actions={
        <>
          <Link to="/admin">К админке</Link>
          <Link to="/">На главную</Link>
        </>
      }
    />
  );
};

export default ForbiddenPage;
