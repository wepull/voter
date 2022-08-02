import React, { Component } from "react";
import cx from "classnames";
import * as s from "./search.module.scss";

import searchIcon from "../../../../assets/svgs/iconSearch.svg";
import searchIconDark from "../../../../assets/svgs/iconSearchBlack.svg";

class SearchBar extends Component {
  render() {
    const { theme, searchValue, handleTextSearch, placeholder } = this.props;
    const textSearchStyle = cx(s.textSearch, {
      [s.textSearchLight]: theme === "Light",
    });
    return (
      <div
        className={textSearchStyle}
        style={{ height: this.props.height, width: this.props.width }}
      >
        <img src={theme === "Dark" ? searchIcon : searchIconDark} alt="" />
        <input
          type="text"
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => handleTextSearch(e)}
        />
      </div>
    );
  }
}

export default SearchBar;
