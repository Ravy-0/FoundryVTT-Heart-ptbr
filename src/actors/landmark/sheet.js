import sheetHTML from './sheet.html';
import './landmark.sass';
import HeartActorSheet from '../base/sheet';
import template from './template.json';

export default class LandmarkSheet extends HeartActorSheet {
    static get defaultOptions() {
        const defaultOptions = super.defaultOptions;
        return mergeObject(defaultOptions, {
            dragDrop: [{dragSelector: '.item', dropSelector: null}]
        })
    }

    async _onDropItemCreate(itemData) {
        if(this.actor.type === 'landmark') {

            itemData.data.active = true;
        }

        return super._onDropItemCreate(itemData);
    }

    static get type() { return Object.keys(template.Actor)[0]; }

    get template() {
        return sheetHTML.path;
    }

    get img() {
        return 'systems/heart/assets/occupy.svg';
    }

    
    getData() {
        const data = super.getData();
        data.user = game.user;
        data.showTextboxesBelowItems = game.settings.get('heart', 'showTextboxesBelowItems')
        data.die_sizes = game.heart.die_sizes.reduce((map, die) => {
            map[die] = game.i18n.format('heart.die_size.d(N)', { N: die.replace(/^d/, '') })
            return map;
        }, {});
        data.resistances = game.heart.resistances.reduce((map, resistance) => {
            map[resistance] = game.i18n.localize(`heart.resistance.${resistance}`)
            return map;
        }, {});
        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('.ordered-checkable-box:not(.checked)').click(async ev => {
            ev.preventDefault();
            const element = ev.currentTarget;
            const index = parseInt(element.dataset.index);
            const parent = element.parentElement;
            const target = parent.dataset.target;
            const uuid = $(ev.currentTarget).closest('[data-item-id]').data('itemId');
            const item = await fromUuid(uuid);

            const data = {};
            data[target] = index + 1;
            item.update(data);
        });

        html.find('.ordered-checkable-box.checked').click(async ev => {
            ev.preventDefault();
            const element = ev.currentTarget;
            const index = parseInt(element.dataset.index);
            const parent = element.parentElement;
            const target = parent.dataset.target;
            const uuid = $(ev.currentTarget).closest('[data-item-id]').data('itemId');
            const item = await fromUuid(uuid);

            const data = {};
            if (index + 1 === getProperty(item.data, target)) {
                data[target] = index;
            } else {
                data[target] = index + 1;
            }
            item.update(data);
        });

        html.find('[data-action=add][data-type]').click(ev => {
            const target = $(ev.currentTarget);
            const type = target.data('type');
            const itemData = target.data('data') || {};

            const doc = new CONFIG.Item.documentClass({
                type,
                name: `New ${type}`,
                data: itemData
            });

            
            this.actor.createEmbeddedDocuments('Item', [doc.toObject()]);
        });


        html.find('[data-action=add-child][data-type]').click(async ev => {
            const target = $(ev.currentTarget);
            const documentName = target.data('document-name') || 'Item';
            const type = target.data('type');
            const uuid = $(ev.currentTarget).closest('[data-item-id]').data('itemId');
            const item = await fromUuid(uuid);
            let itemData = target.data('data') || {};

            const data = {documentName, type: type, name: `New ${type}`, data: itemData };
            item.addChildren([data]);
        });

        html.find('[data-action=view]').click(async ev => {
            const uuid = $(ev.currentTarget).closest('[data-item-id]').data('itemId');
            const item = await fromUuid(uuid);
            item.sheet.render(true);
        });

        html.find('[data-action=delete]').click(async ev => {
            const uuid = $(ev.currentTarget).closest('[data-item-id]').data('itemId');
            const item = await fromUuid(uuid);
            item.deleteDialog();
        });

        html.find('[data-action=item-roll]').click(async ev => {
            const uuid = $(ev.currentTarget).closest('[data-item-id]').data('itemId');
            const item = await fromUuid(uuid);

            const roll = game.heart.rolls.ItemRoll.build({item});
            await roll.evaluate({async: true});

            roll.toMessage({
                flavor: `${localizeHeart(item.name)} (<span class="item-type">${item.type}</span>)`,
                speaker: {actor: this.actor.id}
            });
        });
        
        html.find('[data-action=roll]').click(async ev => {
            const roll = await  game.heart.rolls.HeartRoll.build({
                character: this.actor.id
            });

            roll.toMessage({
                speaker: {actor: this.actor.id}
            });
        });

        html.find('[data-action=stress-roll]').click(async ev => {
            const roll = await game.heart.rolls.StressRoll.build({
                character: this.actor.id
            });

            roll.toMessage({
                speaker: {actor: this.actor.id}
            });
        });

        html.find('[data-item-id] [data-action=activate]').click(async ev => {
            const target = $(ev.currentTarget);
            const uuid = target.closest('[data-item-id]').data('itemId');
            const item = await fromUuid(uuid);
            item.update({'data.active': true});
        });

        html.find('[data-item-id] [data-action=deactivate]').click(async ev => {
            const target = $(ev.currentTarget);
            const uuid = target.closest('[data-item-id]').data('itemId');
            const item = await fromUuid(uuid);
            item.update({'data.active': false});
        });
        
        html.find('[data-item-id] [data-action=complete]').click(async ev => {
            const target = $(ev.currentTarget);
            const uuid = target.closest('[data-item-id]').data('itemId');
            const item = await fromUuid(uuid);
            item.update({'data.complete': true});
        });

        html.find('[data-item-id] [data-action=uncomplete]').click(async ev => {
            const target = $(ev.currentTarget);
            const uuid = target.closest('[data-item-id]').data('itemId');
            const item = await fromUuid(uuid);
            item.update({'data.complete': false});
        });

        html.find('[data-action=upgrade]').click(async ev => {
            const target = $(ev.currentTarget);
            const uuid = target.closest('[data-item-id]').data('itemId');
            const item = await fromUuid(uuid);
            const dieSizes = game.heart.die_sizes;
            const services = item.data.data.resistances;
            
            const updates = {};
            updates['data.upgradeTrack'] = 0;
            
            Object.keys(services).forEach(key => {
                var service = services[key];
                var indexOf = dieSizes.indexOf(service.die_size);
                
                if(indexOf < (dieSizes.length - 1)) {
                    var largerSize = dieSizes[indexOf+1];
                    updates[`data.resistances.${key}.die_size`] = largerSize;
                }
            });

            item.update(updates);
        });

        html.find('[data-action=downgrade]').click(async ev => {
            const target = $(ev.currentTarget);
            const uuid = target.closest('[data-item-id]').data('itemId');
            const item = await fromUuid(uuid);
            const dieSizes = game.heart.die_sizes;
            const services = item.data.data.resistances;

            const updates = {};
            
            Object.keys(services).forEach(key => {
                var service = services[key];
                var indexOf = dieSizes.indexOf(service.die_size);
                
                if(indexOf > 0) {
                    var smallerSize = dieSizes[indexOf-1];
                    updates[`data.resistances.${key}.die_size`] = smallerSize;
                }
            });

            item.update(updates);
        });

        html.find('[data-action=add-service]').click(async ev => {
            const target = $(ev.currentTarget);
            const id = randomID();
            const uuid = target.closest('[data-item-id]').data('itemId');
            const item = await fromUuid(uuid);
            item.update({[`data.resistances.${id}`]: {
                die_size: 'd4',
                resistance: 'blood'
            }});
        });

        html.find('[data-action=delete-service]').click(async ev => {
            const target = $(ev.currentTarget);
            const uuid = target.closest('[data-item-id]').data('itemId');
            const item = await fromUuid(uuid);
            const id = target.closest ('[data-id]').data('id');
            item.update({[`data.resistances.-=${id}`]: null});
        });

        html.find('[name=service-selector-die]').change(async ev => {
            const target = $(ev.currentTarget);
            const uuid = target.closest('[data-item-id]').data('itemId');
            const item = await fromUuid(uuid);
            const id = target.closest ('[data-id]').data('id');
            const val = ev.target.value;
            item.update({[`data.resistances.${id}`]: {
                die_size: val
            }});
        });

        html.find('[name=service-selector-resistance]').change(async ev => {
            const target = $(ev.currentTarget);
            const uuid = target.closest('[data-item-id]').data('itemId');
            const item = await fromUuid(uuid);
            const id = target.closest ('[data-id]').data('id');
            const val = ev.target.value;
            item.update({[`data.resistances.${id}`]: {
                resistance: val
            }});
        });

        html.find('[data-action=service-roll]').click(async ev => {
            const uuid = $(ev.currentTarget).closest('[data-item-id]').data('itemId');
            const hauntitem = await fromUuid(uuid);
            const target = $(ev.currentTarget);
            const id = target.closest ('[data-id]').data('id');
            const service = hauntitem.data.data.resistances[id];
            const item = {data:{data:{die_size:service.die_size}}};

            const roll = game.heart.rolls.ItemRoll.build({item});
            await roll.evaluate({async: true});

            roll.toMessage({
                flavor: `${localizeHeart(hauntitem.name)} (<span class="item-type">${hauntitem.type}</span>)`,
                speaker: {alias: "GM"}
            });
        });
    }
}