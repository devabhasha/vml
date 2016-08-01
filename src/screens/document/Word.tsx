import * as React from "react";
import { grey300, grey500, orange500 } from "material-ui/styles/colors";
import { observable, action } from "mobx";
import { observer } from "mobx-react";
import { Models } from "vml-common";

import { DocumentStore } from "../../stores";
import { translit, getColour, getLightColour } from "../../shared/utils";

interface WordProps {
    word: Models.Word;
    onWordClicked: any;
}

@observer
export class Word extends React.Component<WordProps, {}> {
    @observable hovered: boolean;

    @action
    setHovered = (hovered: boolean) => {

        this.hovered = hovered;
    }

    handleMouseEnter = () => {

        this.setHovered(true);
    }

    handleMouseLeave = () => {

        this.setHovered(false);
    }

    render() {

        const { word, onWordClicked } = this.props;

        return (
            <span
                style={ styles.wordContainer(this.hovered) }
                onMouseEnter={ this.handleMouseEnter }
                onMouseLeave={ this.handleMouseLeave }
                onTouchTap={ (event) => onWordClicked(event, word) }
                >
                <span>{ translit(word.word) }</span>
                <span style={ styles.analysedTokens }>
                    {
                        word.analysis ? word.analysis.map((w, i) => {
                            return React.Children.toArray([
                                <span style={ { color: grey500 } }> { i === 0 ? "" : "+" } </span>,
                                <span style={ { color: getColour(i) } }>{ translit(w.token) }</span>
                            ]);
                        }) : null
                    }
                </span>
            </span>
        );
    }
}

const styles = {
    wordContainer: (hovered: boolean) => {
        let style = {
            display: "flex",
            flexDirection: "column",
            padding: 5,
            cursor: "pointer"
        };

        if (hovered) {
            Object.assign(style, {
                backgroundColor: grey300
            });
        }
        return style;
    },
    analysedTokens: {
        fontSize: "75%"
    }
};