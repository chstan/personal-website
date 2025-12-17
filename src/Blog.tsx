import React from "react";
import {useParams} from 'react-router';
import {WRITING} from "./data";
import {DynamicMarkdown,} from "./common";
import {Link} from "react-router-dom";


const Breadcrumb: React.FC<{crumbs: Array<[string, string]>}> = ({crumbs}) =>
  <header className="breadcrumb">
    ← / {crumbs.map(([to, label]) => <Link to={to}>{label}</Link>)} /
  </header>;


const BlogItem = () => {
  const { blogId } = useParams() as { blogId: string,};

  return <div className="blog-item">
    <Breadcrumb crumbs={[['/writing', 'Writing']]}/>
    <article>
      <DynamicMarkdown articleId={blogId} />
    </article>
  </div>
};

const BlogPage = () => <div className="project-container">
  {WRITING.map(w => {
    return (
      <div className="blog">
        {w.label ? <a href={`/writing/${w.label}`}><h2>{w.title}</h2></a> : <h2>{w.title}</h2>}
        <p className="blog-short">{w.short}</p>
      </div>
    );
  })}
</div>;

export {
  BlogPage,
  BlogItem,
};
