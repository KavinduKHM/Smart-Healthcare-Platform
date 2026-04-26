import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './ForbiddenPage.css';

const ForbiddenPage = () => {
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from') || '/';

  return (
    <div className="forbiddenRoot">
      <section className="forbiddenCard" aria-label="Forbidden">
        <h1 className="forbiddenTitle">403 - Forbidden</h1>
        <p className="muted forbiddenSubtitle">
          You’re signed in, but your current role is not allowed to access this page.
        </p>

        <div className="forbiddenActions">
          <Link className="forbiddenButton" to={from.startsWith('/') ? from : '/'}>
            Go back
          </Link>
          <Link className="forbiddenButton secondary" to="/">
            Home
          </Link>
        </div>

        <div className="forbiddenHelp">
          <p className="muted" style={{ margin: 0 }}>
            Tip: a <strong>401</strong> means you need to log in. A <strong>403</strong> means you’re logged in but lack the required role.
          </p>
        </div>
      </section>
    </div>
  );
};

export default ForbiddenPage;
