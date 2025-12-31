import React from "react";
import {WRITING} from "./data";
import {DynamicMarkdown,} from "./common";
import {Link, useParams} from "react-router-dom";


const Breadcrumb: React.FC<{crumbs: Array<[string, string]>}> = ({crumbs}) =>
  <header className="breadcrumb">
    ← / {crumbs.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)} /
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
    if (!w.released) return null;
    const link = w.externalUrl ? w.externalUrl : `/writing/${w.label}`;
    return (
      <div key={w.title} className="blog">
        {w.label || w.externalUrl ? <a href={link}><h2>{w.title}</h2></a> : <h2>{w.title}</h2>}
        <p className="blog-short">{w.short}</p>
      </div>
    );
  })}
</div>;

export {
  BlogPage,
  BlogItem,
};
