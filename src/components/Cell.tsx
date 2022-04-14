import { ActionTypes, DataTypes, MetadataColumns } from "helpers/Constants";
import React, { useLayoutEffect, useRef, useState } from "react";
import ContentEditable, { ContentEditableEvent } from "react-contenteditable"
import { FileManagerDB } from "services/FileManagerService";
import { LOGGER } from "services/Logger";
import { Cell } from 'react-table';
import { MarkdownRenderer } from "obsidian";
import PlusIcon from "components/img/Plus";
import { grey, randomColor } from "helpers/Colors";
import { usePopper } from "react-popper";
import { databaseReducer } from "./reducers/DatabaseDispatch";
import Relationship from "components/RelationShip";

/**
 * Obtain the path of the file inside cellValue
 * i.e. if cellValue is "[[path/to/file.md|File Name]]" then return "path/to/file.md"
 * i.e. if cellValue is "[[path/to/file.md]]" then return "path/to/file.md"
 * i.e. if cellValue is "[[file.md]]" then return "file.md"
 * @param cellValue 
 */
 function getFilePath(cellValue:string):string {
  const regex = /\[\[(.*)\]\]/;
  const matches = regex.exec(cellValue);
  if (matches && matches.length > 1) {
      return matches[1];
  }
  return "";
}

export default function Cell(cellProperties:Cell) {
    const dataDispatch = databaseReducer;
    /** Initial state of cell */
    const initialValue = cellProperties.value;
    /** Type of cell */
    const dataType = (cellProperties.column as any).dataType;
    /** Column options */
    const options = (cellProperties.column as any).options;
    // state of cell value
    const [value, setValue] = useState({ value: initialValue, update: false });
    // state for keeping the timeout
    const [editNoteTimeout, setEditNoteTimeout] = useState(null);
    // states for selector option
    const [selectRef, setSelectRef] = useState(null);
    const [selectPop, setSelectPop] = useState(null);
    const [showSelect, setShowSelect] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [addSelectRef, setAddSelectRef] = useState(null);
    const { styles, attributes } = usePopper(selectRef, selectPop, {
      placement: 'bottom-start',
      strategy: 'fixed',
    });
    // onChange handler
  const handleOnChange = (event:ContentEditableEvent) => {
    LOGGER.debug(`=>Cell.handleOnChange. ${event.target.value}`);
    // cancelling previous timeouts
      if (editNoteTimeout) {
        clearTimeout(editNoteTimeout);
      }
      // first update the input text as user type
      setValue({ value: event.target.value, update: false });
      // initialize a setimeout by wrapping in our editNoteTimeout so that we can clear it out using clearTimeout
      setEditNoteTimeout(
        setTimeout(() => {
          onChange(event);
          // timeout until event is triggered after user has stopped typing
        }, 1500),
      );
      LOGGER.debug(`<=Cell.handleOnChange`);
  };

    function getColor() {
      let match = options.find((option: { label: any; }) => option.label === value.value);
      return (match && match.backgroundColor) || grey(200);
    }

    function onChange(event:ContentEditableEvent) {
      updateTargetNoteCell(event.target.value);
    }

    function updateTargetNoteCell(targetValue:string) {
      const cellBasenameFile:string = (cellProperties.row.original as any)[MetadataColumns.FILE].replace(/\[\[|\]\]/g, '').split('|')[0];
      LOGGER.debug(`<=>Cell: updateTargetNoteCell: ${cellBasenameFile} with value: ${targetValue}`);
      const columnId = cellProperties.column.id;
      let noteObject = {
        action: 'replace',
        filePath: `${cellBasenameFile}`,
        regexp: new RegExp(`^[\s]*${columnId}[:]{1}(.+)$`,"gm"),
        newValue: `${columnId}: ${targetValue}`
      };
      FileManagerDB.editNoteContent(noteObject);
    }
    function handleAddOption(e:any) {
      setShowAdd(true);
    }

    function handleOptionClick(option: { label: any; backgroundColor?: any; }) {
      setValue({ value: option.label, update: true });
      setShowSelect(false);
      updateTargetNoteCell(option.label);
    }

    function handleOptionBlur(e:any) {
      if (e.target.value !== '') {
        dataDispatch({
          option: e.target.value,
          backgroundColor: randomColor(),
          columnId: (cellProperties.column as any).id
        }, {type: ActionTypes.ADD_OPTION_TO_COLUMN});
      }
      setShowAdd(false);
    }

    function handleOptionKeyDown(e:any) {
      if (e.key === 'Enter') {
        if (e.target.value !== '') {
          dataDispatch({
            option: e.target.value,
            backgroundColor: randomColor(),
            columnId: (cellProperties.column as any).id
          },{type: ActionTypes.ADD_OPTION_TO_COLUMN});
        }
        setShowAdd(false);
      }
    }

    function getCellElement() {
      LOGGER.debug(`<=>Cell: Type: ${dataType}`);
      switch (dataType) {
        /** Plain text option */
        case DataTypes.TEXT:
        return (
          <ContentEditable
            html={(value.value && value.value.toString()) || ''}
            onChange={handleOnChange}
            onBlur={() => setValue(old => ({ value: old.value, update: true }))}
            className="data-input"
          />
        );
        /** Number option */
        case DataTypes.NUMBER:
        return (
          <ContentEditable
            html={(value.value && value.value.toString()) || ''}
            onChange={handleOnChange}
            onBlur={() => setValue(old => ({ value: old.value, update: true }))}
            className="data-input text-align-right"
          />
        );
        /** Markdown option */
        case DataTypes.MARKDOWN:
          const containerRef = useRef<HTMLElement>();
          useLayoutEffect(() => {
            //TODO - this is a hack. find why is layout effect called twice
            containerRef.current.innerHTML = '';
            MarkdownRenderer.renderMarkdown(
              value.value,
              containerRef.current,
              getFilePath(value.value),
              null
            );
          });
          return (
          <span ref={containerRef}></span>
          );
        /** Selector option */
        case DataTypes.SELECT:
          return (
            <>
              <div
                ref={setSelectRef}
                className='cell-padding d-flex cursor-default align-items-center flex-1'
                onClick={() => setShowSelect(true)}>
                {value.value && <Relationship value={value.value} backgroundColor={getColor()} />}
              </div>
              {showSelect && <div className='overlay' onClick={() => setShowSelect(false)} />}
              {showSelect && (
                <div
                  className='shadow-5 bg-white border-radius-md'
                  ref={setSelectPop}
                  {...attributes.popper}
                  style={{
                    ...styles.popper,
                    zIndex: 4,
                    minWidth: 200,
                    maxWidth: 320,
                    padding: "0.75rem"
                  }}>
                  <div className='d-flex flex-wrap-wrap' style={{marginTop: "-0.5rem"}}>
                    {options.map((option:any) => (
                      <div
                        className='cursor-pointer'
                        style={{marginRight: "0.5rem", marginTop: "0.5rem"}}
                        onClick={() => handleOptionClick(option)}>
                        <Relationship value={option.label} backgroundColor={option.backgroundColor} />
                      </div>
                    ))}
                    {showAdd && (
                      <div
                        style={{
                          marginRight: "0.5rem",
                          marginTop: "0.5rem",
                          width: 120,
                          padding: "2px 4px",
                          backgroundColor: grey(200),
                          borderRadius: 4
                        }}>
                        <input
                          type='text'
                          className='option-input'
                          onBlur={handleOptionBlur}
                          ref={setAddSelectRef}
                          onKeyDown={handleOptionKeyDown}
                        />
                      </div>
                    )}
                    <div
                      className='cursor-pointer'
                      style={{marginRight: "0.5rem", marginTop: "0.5rem"}}
                      onClick={handleAddOption}>
                      <Relationship
                        value={
                          <span className='svg-icon-sm svg-text'>
                            <PlusIcon />
                          </span>
                        }
                        backgroundColor={grey(200)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        /** Default option */
        default:
          LOGGER.warn(`<=Cell. unknown data type '${dataType}'`,`Properties asociated: ${Object.keys(cellProperties)}`);
          return <span></span>;
      }
    }
    return getCellElement();
}