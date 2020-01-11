import React from "react";
import { Link } from "react-router-dom";
import {ProjectInfo, PROJECTS} from "./data";

const ProjectSummary: React.FC<ProjectInfo> = ({title, pictureUrl, description, label}) => {
  const imageStyles = {
    backgroundSize: '140px 140px',
    background: `url(${pictureUrl || '/img/gray.png'}) no-repeat center 0`,
  };

  let titleOrLink = <h1>{title}</h1>;
  if (label) {
    titleOrLink = <Link to={label}>{title}</Link>;
  }

  return (
    <div className="table-div">
      <div>
        <div className="project-image" style={imageStyles} />
      </div>
      <div className="project-content">
        {titleOrLink}
        <p>{description}</p>
      </div>
    </div>
  );
};

const ProjectsPage: React.FC = () => {
  return (
    <div id="project-description-list">
      {PROJECTS.map(p => <ProjectSummary {...p}/>)}
    </div>
  );
};

export {
  ProjectSummary,
  ProjectsPage,
};
