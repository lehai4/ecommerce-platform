import React, { useEffect } from "react";

type HelmetProps = {
  title: string;
  children: React.ReactNode;
};
const Helmet = (props: HelmetProps): JSX.Element => {
  document.title = "CMS | " + props.title;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return <>{props.children}</>;
};

export default Helmet;
