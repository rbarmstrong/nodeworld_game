/* eslint-disable @typescript-eslint/no-non-null-assertion */
import Phaser from 'phaser';
import GameSyncManager from '../manager/GameSyncManager';
import { TEXTURE_KEYS } from '../manager/TextureKeyManager';
import BrickTileBG from '../resources/images/backgrounds/brick_tile_bg.png';
import CloseButton from '../ui/button/CloseButton';
import CapitalBuilding from '../resources/images/buildings/capital_building.png';
import Dwelling from '../resources/images/buildings/dwelling.png';
import Extractor from '../resources/images/buildings/extractor.png';
import Harvestor from '../resources/images/buildings/harvestor.png';
import PowerStation from '../resources/images/buildings/power_station.png';
import Barracks from '../resources/images/buildings/barracks.png';
import UIScene from './UIScene';
import type { Building_Type, Resource_Type } from '@prisma/client';
import { cellSize } from './MainScene';
import BuildingManager from '../logic/buildings/BuildingManager';
import type { Rect } from '../interfaces/general';

type BuildingInfo = {
	textureKey: string;
	src: string;
};

export default class ConstructBuildingUIScene extends Phaser.Scene {
	gameSyncManager: GameSyncManager;
	constructRectangle: Rect;
	textAndImages: Record<
		Building_Type,
		| {
				text: Phaser.GameObjects.Text;
				image: Phaser.GameObjects.Image;
		  }
		| undefined
	>;

	static Buildings: Record<Building_Type, BuildingInfo> = {
		CAPITAL_BUILDING: { textureKey: TEXTURE_KEYS.CapitalBuilding, src: CapitalBuilding.src },
		POWER_STATION: { textureKey: TEXTURE_KEYS.PowerStation, src: PowerStation.src },
		DWELLING: { textureKey: TEXTURE_KEYS.Dwelling, src: Dwelling.src },
		EXTRACTOR: { textureKey: TEXTURE_KEYS.Extractor, src: Extractor.src },
		HARVESTOR: { textureKey: TEXTURE_KEYS.Harvestor, src: Harvestor.src },
		BARRACKS: { textureKey: TEXTURE_KEYS.Barracks, src: Barracks.src },
	};

	constructor(config: Phaser.Types.Scenes.SettingsConfig, gameSyncManager: GameSyncManager) {
		super(config);
		this.gameSyncManager = gameSyncManager;
		this.textAndImages = {
			CAPITAL_BUILDING: undefined,
			POWER_STATION: undefined,
			DWELLING: undefined,
			EXTRACTOR: undefined,
			HARVESTOR: undefined,
			BARRACKS: undefined,
		};
	}

	preload() {
		this.load.image(TEXTURE_KEYS.BrickTileBg, BrickTileBG.src);
		Object.values(ConstructBuildingUIScene.Buildings).forEach((buildingObj) => {
			this.load.image(buildingObj.textureKey, buildingObj.src);
		});
	}

	create() {
		const cameraHeight = this.cameras.main.displayHeight - UIScene.BAR_THICKNESS;
		const height = cameraHeight * 0.75;
		const width = this.cameras.main.displayWidth * 0.75;
		const x = (this.cameras.main.displayWidth - width) / 2;
		const y = (cameraHeight - height) / 2;
		this.constructRectangle = { x, y, width, height };
		const tiledBG = this.add.tileSprite(x, y, width, height, TEXTURE_KEYS.BrickTileBg);
		tiledBG.setOrigin(0, 0);
		new CloseButton(this, { x: x + width, y }, () => {
			this.sys.setVisible(false);
		});
		this.initDrawTextAndImages();
		this.gameSyncManager.on(GameSyncManager.EVENTS.BASE_GAME_STATE_UPDATED, () => this.updateTextAndImages());
	}

	private updateTextAndImages() {
		const resources = this.gameSyncManager.getBaseData()?.resources;
		Object.entries(this.textAndImages).forEach(([key, value]) => {
			if (value == undefined) {
				return;
			}
			const buildingType = key as Building_Type;
			const resourcesAfter = resources && BuildingManager.getResourcesAfterPurchase(resources, buildingType);
			if (resourcesAfter == null) {
				value.text.setColor('darkred');
				value.text.setShadow(1, 1, 'grey', 1);
			} else {
				value.text.setColor('white');
				value.text.setShadow(1, 1, 'blue', 3);
			}
		});
	}

	private initDrawTextAndImages() {
		const { x, y, width } = this.constructRectangle;
		let yOffset = 50;
		const title = this.add.text(x + width / 2, y + yOffset, 'Construct a Building');
		title.setFont('Consolas');
		title.setFontSize(30);
		title.setOrigin(0.5, 0.5);

		const numCols = 3;
		const xOffset = width / numCols;
		const buildings = Object.keys(ConstructBuildingUIScene.Buildings) as Building_Type[];
		let buildingIndex = 0;
		yOffset += 100;
		while (buildingIndex < buildings.length) {
			for (let i = 0; i < numCols; i++) {
				if (buildingIndex >= buildings.length) {
					break;
				}
				const buildingType = buildings[buildingIndex]!;
				const imageX = x + 100 + xOffset * i;
				const image = this.add.image(imageX, y + yOffset, ConstructBuildingUIScene.Buildings[buildingType].textureKey);
				image.setScale(cellSize.height / image.displayHeight);
				image.setDepth(10);
				image.setOrigin(0.5, 0.5);
				image.setInteractive();
				const { size, buildTimeSeconds, energyDraw, costs } = BuildingManager.BUILDING_DATA[buildingType];
				const costsStr = Object.entries(costs)
					.map(
						([costKey, costValue]) => `
						> ${UIScene.getResourceSymbol(costKey as Resource_Type)}: ${costValue}`,
					)
					.join('\n');
				const imageInfoText = `${buildingType}\n
					- ${size.width} x ${size.height}
					- ${buildTimeSeconds} seconds to build
					- ⚡ ${-1 * energyDraw}
					- Costs:
						${costsStr}`;
				const infoTextObj = this.add.text(
					imageX + cellSize.height * 0.6,
					y + yOffset - cellSize.height / 2,
					imageInfoText,
				);
				infoTextObj.setFont('Consolas');
				infoTextObj.setFontSize(15);
				infoTextObj.setOrigin(0, 0);
				infoTextObj.setShadow(1, 1, 'blue', 3);

				this.textAndImages[buildingType] = {
					text: infoTextObj,
					image,
				};
				buildingIndex++;
			}
			yOffset += 100 + cellSize.height;
		}
	}
}
