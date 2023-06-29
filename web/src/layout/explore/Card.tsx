import { Item, Repository } from '../../types';
import prettifyNumber from '../../utils/prettifyNumber';
import styles from './Card.module.css';

interface Props {
  item: Item;
  className?: string;
}

const Card = (props: Props) => {
  let description = 'This item does not have a description available';
  let stars: number | undefined;
  if (props.item.repositories) {
    const primaryRepo = props.item.repositories.find((repo: Repository) => repo.primary);

    if (
      props.item.crunchbase_data &&
      props.item.crunchbase_data.description &&
      props.item.crunchbase_data.description !== ''
    ) {
      console.log(props.item.crunchbase_data.description);
      description = props.item.crunchbase_data.description;
    }

    if (
      primaryRepo &&
      primaryRepo.github_data &&
      primaryRepo.github_data.description &&
      primaryRepo.github_data.description !== ''
    ) {
      description = primaryRepo.github_data.description;
    }

    props.item.repositories.forEach((repo: Repository) => {
      if (repo.github_data) {
        stars = stars || 0 + repo.github_data.stars;
      }
    });
  }

  return (
    <div className={props.className}>
      <div className="d-flex flex-row">
        <div className={`d-flex align-items-center justify-content-center me-3 ${styles.logoWrapper}`}>
          <img
            alt={`${props.item.name} logo`}
            className={`m-auto ${styles.logo}`}
            src={import.meta.env.MODE === 'development' ? `../../static/${props.item.logo}` : `${props.item.logo}`}
          />
        </div>

        <div className={`flex-grow-1 p-3 ${styles.itemInfo}`}>
          <div className="fw-semibold text-truncate mb-1">{props.item.name}</div>
          <div>
            {props.item.project !== undefined ? (
              <>
                <div className="badge rounded-0 bg-primary">CNCF</div>
                <div className="badge rounded-0 bg-secondary text-uppercase ms-2">{props.item.project}</div>
              </>
            ) : (
              <>
                <div className={`badge rounded-0 ${styles.badge}`}>-</div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className={`mt-3 text-muted ${styles.description}`}>{description}</div>
      {(stars || props.item.project === undefined) && (
        <div
          className={`d-flex flex-row justify-content-between align-items-baseline text-muted mt-3 ${styles.additionalInfo}`}
        >
          <div className="d-flex flex-row align-items-baseline">
            {props.item.project === undefined && (
              <>
                <small className="me-1 text-black-50">FUNDING:</small>
                <div>
                  {props.item.crunchbase_data &&
                  props.item.crunchbase_data.funding &&
                  props.item.crunchbase_data.funding > 0 ? (
                    <>{prettifyNumber(props.item.crunchbase_data.funding)}</>
                  ) : (
                    <>-</>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="d-flex flex-row align-items-baseline">
            {stars && (
              <>
                <svg
                  className={`position-relative text-black-50 ${styles.starIcon}`}
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="0"
                  viewBox="0 0 576 512"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"></path>
                </svg>
                <div className="ms-1">{prettifyNumber(stars)}</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Card;
