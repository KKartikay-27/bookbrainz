/*
 * Copyright (C) 2018  Ben Ockmore
 *				 2021  Akash Gupta
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */


import * as Immutable from 'immutable';
import * as React from 'react';

import {
	Action,
	addRelationship,
	editRelationship,
	hideRelationshipEditor,
	removeRelationship,
	showRelationshipEditor,
	sortItems,
	undoLastSave
} from './actions';
import {Button, ButtonGroup, Col, Row} from 'react-bootstrap';
import type {
	Entity,
	EntityType,
	LanguageOption,
	RelationshipForDisplay,
	RelationshipType,
	setPosition,
	Relationship as _Relationship
} from './types';
import {faPencilAlt, faPlus, faTimes, faUndo} from '@fortawesome/free-solid-svg-icons';
import type {Dispatch} from 'redux'; // eslint-disable-line import/named
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import Relationship from './relationship';
import RelationshipEditor from './relationship-editor';
import _ from 'lodash';
import {connect} from 'react-redux';
import {SortableContainer, SortableElement} from 'react-sortable-hoc';

export function RelationshipListItem({contextEntity, onEdit, onRemove, relationshipType, sourceEntity, targetEntity,rowID, dragHandler}) {
	return (
		<Row className="margin-top-d5" key={rowID}>
		<Col md={onEdit || onRemove ? 8 : 12}>
			<Relationship
				link
				dragHandler={dragHandler}
				contextEntity={contextEntity}
				relationshipType={relationshipType}
				sourceEntity={sourceEntity}
				targetEntity={targetEntity}
			/>
		</Col>
		{(onEdit || onRemove) &&
			<Col className="text-right" md={4}>
				<ButtonGroup justified>
					{onEdit &&
						<Button
							bsStyle="warning"
							href="#"
							role="button"
							onClick={onEdit.bind(this, rowID)}
						>
							<FontAwesomeIcon icon={faPencilAlt}/>
							<span>&nbsp;Edit</span>
						</Button>
					}
					{onRemove &&
						<Button
							bsStyle="danger"
							href="#"
							role="button"
							onClick={onRemove.bind(this, rowID)}
						>
							<FontAwesomeIcon icon={faTimes}/>
							<span>&nbsp;Remove</span>
						</Button>
					}
				</ButtonGroup>
			</Col>
		}
	</Row>

	)
}
const SortableItem = SortableElement(({value, onEdit, onRemove, contextEntity}) => {
const {relationshipType, sourceEntity, targetEntity,rowID} = value;
return (
		<RelationshipListItem
			contextEntity={contextEntity}
			relationshipType={relationshipType}
			sourceEntity={sourceEntity}
			targetEntity={targetEntity}
			rowID={rowID}
			onEdit={onEdit}
			onRemove={onRemove}
			dragHandler={true}
		/>
	)
}
);

const SortableList = SortableContainer(({children}) => {
  return <div>{children}</div>;
});

type RelationshipListProps = {
	contextEntity: Entity,
	relationships: Array<RelationshipForDisplay>,
	onEdit: (number) => unknown,
	onRemove: (number) => unknown
};

/* In the ButtonGroup below we are forced to use an 'href' attribute to turn them into <a> elements
   or wrap the children <button> elements in another ButtonGroup
   https://getbootstrap.com/docs/3.4/components/#with-%3Cbutton%3E-elements
*/

export function RelationshipList(
	{contextEntity, relationships, onEdit, onRemove}: RelationshipListProps
) {
	/* eslint-disable react/jsx-no-bind */
	const renderedRelationships = _.map(
		relationships,
		({relationshipType, sourceEntity, targetEntity, rowID}) => (
			<RelationshipListItem
				key={rowID}
				contextEntity={contextEntity}
				relationshipType={relationshipType}
				sourceEntity={sourceEntity}
				targetEntity={targetEntity}
				rowID={rowID}
				onEdit={onEdit}
				onRemove={onRemove}
				dragHandler={false}
			/>
		)
	);

	/* eslint-enable react/jsx-no-bind */

	return <div>{renderedRelationships}</div>;
}

type OwnProps = {
	entity: Entity,
	entityType: EntityType,
	languageOptions: Array<LanguageOption>,
	relationshipTypes: Array<RelationshipType>,
};

type StateProps = {
	canEdit: boolean,
	seriesTypeValue: string,
	orderTypeValue: number,
	entityName: string,
	relationships: Immutable.List<any>,
	relationshipEditorProps: Immutable.Map<string, any>,
	showEditor: boolean,
	undoPossible: boolean
};

type DispatchProps = {
	onAddRelationship: () => unknown,
	onEditorClose: () => unknown,
	onSortItems: (setPosition) => unknown,
	onEditorAdd: (_Relationship) => unknown,
	onEdit: (number) => unknown,
	onRemove: (number) => unknown,
	onUndo: () => unknown
};

type Props = OwnProps & StateProps & DispatchProps;


function RelationshipSection({
	canEdit, entity, entityType, entityName, languageOptions, showEditor, relationships,
	relationshipEditorProps, relationshipTypes,orderTypeValue, seriesTypeValue, onAddRelationship,
	onEditorClose, onEditorAdd, onSortItems, onEdit, onRemove, onUndo, undoPossible
}: Props) {
	const baseEntity = {
		bbid: _.get(entity, 'bbid'),
		defaultAlias: {
			name: entityName
		},
		disambiguation: _.get(entity, ['disambiguation', 'comment']),
		type: _.upperFirst(entityType)
	};
	const relationshipsObject = relationships.toJS();
	const relationshipsArray: Array<RelationshipForDisplay> = Object.values(relationshipsObject)

	/* If one of the relationships is to a new entity (in creation),
	update that new entity's name to replace "New Entity" */
	if (typeof baseEntity.bbid === 'undefined') {
		_.forEach(relationshipsObject, relationship => {
			const {sourceEntity, targetEntity} = relationship;
			const defaultAliasPath = ['defaultAlias', 'name'];
			const newEntity = [sourceEntity, targetEntity].find(({bbid}) => bbid === baseEntity.bbid);
			const newRelationshipName = newEntity && _.get(newEntity, defaultAliasPath);
			const baseEntityName = _.get(baseEntity, defaultAliasPath);
			if (newRelationshipName !== baseEntityName) {
				_.set(newEntity, defaultAliasPath, baseEntityName);
			}
		});
	}

	const languageOptionsForDisplay = languageOptions.map((language) => ({
		label: language.name,
		value: language.id
	}));

	const editor = (
		<RelationshipEditor
			baseEntity={baseEntity}
			initRelationship={
				relationshipEditorProps && relationshipEditorProps.toJS()
			}
			seriesType={seriesTypeValue}
			languageOptions={languageOptionsForDisplay}
			relationshipTypes={relationshipTypes}
			onAdd={onEditorAdd}
			setPosition={onSortItems}
			onCancel={onEditorClose}
			onClose={onEditorClose}
		/>
	);

	return (
		<div>
			{canEdit && showEditor && editor}
			<h2>How are other entities related to this {_.startCase(entityType)}?</h2>
			<Row>
				<Col sm={12}>
					{orderTypeValue === 2 ?
					<SortableList distance={1} onSortEnd={onSortItems}>
						{relationshipsArray.map((value:any, index) => (
						<SortableItem 
							key={`${value.rowID}`} 
							index={index}
							value={value} 
							contextEntity={baseEntity}
							onEdit={canEdit ? onEdit : null}
							onRemove={canEdit ? onRemove : null}
						/>
						))}
					</SortableList>
					:
					<RelationshipList
						contextEntity={baseEntity}
						relationships={relationshipsArray}
						onEdit={canEdit ? onEdit : null}
						onRemove={canEdit ? onRemove : null}
					/>}
				</Col>
			</Row>
			{canEdit &&
				<Row className="margin-top-1">
					<Col
						className="text-center"
						md={4}
						mdOffset={4}
					>
						<Button
							bsStyle="success"
							onClick={onAddRelationship}
						>
							<FontAwesomeIcon icon={faPlus}/>
							<span>&nbsp;Add relationship</span>
						</Button>
					</Col>
				</Row>
			}
			{undoPossible && canEdit &&
				<Row className="margin-top-d5">
					<Col
						className="text-center"
						md={4}
						mdOffset={4}
					>
						<Button
							onClick={onUndo}
						>
							<FontAwesomeIcon icon={faUndo}/>
							<span>&nbsp;Undo last action</span>
						</Button>
					</Col>
				</Row>
			}
		</div>
	);
}

RelationshipSection.displayName = 'RelationshipSection';
RelationshipSection.propTypes = {
	languageOptions: PropTypes.array.isRequired
};

function mapStateToProps(rootState): StateProps {
	const state = rootState.get('relationshipSection');
	return {
		canEdit: state.get('canEdit'),
		entityName: rootState.getIn(['nameSection', 'name']),
		seriesTypeValue: rootState.getIn(['seriesSection', 'seriesType']),
		orderTypeValue: rootState.getIn(['seriesSection', 'orderType']),
		relationshipEditorProps: state.get('relationshipEditorProps'),
		relationships: state.get('relationships'),
		showEditor: state.get('relationshipEditorVisible'),
		undoPossible: state.get('lastRelationships') !== null
	};
}

function mapDispatchToProps(dispatch: Dispatch<Action>): DispatchProps {
	return {
		onAddRelationship: () => dispatch(showRelationshipEditor()),
		onEdit: (rowID) => dispatch(editRelationship(rowID)),
		onEditorAdd: (data) => dispatch(addRelationship(data)),
		onEditorClose: () => dispatch(hideRelationshipEditor()),
		onRemove: (rowID) => dispatch(removeRelationship(rowID)),
		onUndo: () => dispatch(undoLastSave()),
		onSortItems: ({oldIndex, newIndex}) => dispatch(sortItems(oldIndex, newIndex)) 
	};
}

export default connect(mapStateToProps, mapDispatchToProps)(
	RelationshipSection
);
